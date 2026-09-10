import {
  criarSessao,
  ipDaRequisicao,
  registrarAuditoria,
  segredoConfigurado,
  verificarOrigem,
} from '@/lib/auth'
import { buscarPorEmail } from '@/lib/repositories/usuarios'
import { autorizada } from '@/lib/repositories/lista_acesso'
import { verificarSenha } from '@/lib/senha.mjs'
import { loginSchema } from '@/lib/validacao'
import { erro, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

/**
 * Limitação simples de tentativas por IP. Em ambiente serverless a memória é
 * por instância, então isto reduz força bruta sem substituir o rate limit da
 * plataforma. Não é a única defesa: a senha é scrypt e a resposta é genérica.
 */
const TENTATIVAS = new Map()
const JANELA_MS = 10 * 60 * 1000
const MAXIMO = 10

/**
 * Hash com os mesmos parâmetros de custo dos hashes reais, usado quando o
 * e-mail não existe. Assim o tempo de resposta não distingue os dois casos.
 * Nunca confere com senha alguma: a chave derivada é toda de zeros.
 */
const HASH_INEXISTENTE = [
  'scrypt',
  16384,
  8,
  1,
  Buffer.alloc(16).toString('base64'),
  Buffer.alloc(64).toString('base64'),
].join('$')

function excedeu(ip) {
  if (!ip) return false
  const agora = Date.now()
  const registro = TENTATIVAS.get(ip)
  if (!registro || agora - registro.desde > JANELA_MS) {
    TENTATIVAS.set(ip, { desde: agora, contagem: 0 })
    return false
  }
  return registro.contagem >= MAXIMO
}

function contabilizar(ip) {
  if (!ip) return
  const registro = TENTATIVAS.get(ip)
  if (registro) registro.contagem += 1
}

function limpar(ip) {
  if (ip) TENTATIVAS.delete(ip)
}

export async function POST(request) {
  try {
    verificarOrigem(request)

    if (!segredoConfigurado()) {
      return erro(
        'A variável AUTH_SECRET não está configurada. O login fica indisponível até que ela seja definida.',
        503,
      )
    }

    const ip = ipDaRequisicao(request)
    if (excedeu(ip)) {
      return erro('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429)
    }

    const corpo = await lerJson(request, 10_000)
    const validado = loginSchema.safeParse(corpo)
    if (!validado.success) {
      contabilizar(ip)
      return erro('Informe e-mail e senha válidos.', 400)
    }

    const usuario = await buscarPorEmail(validado.data.email)

    // Mesma mensagem e trabalho semelhante nos dois casos, para não revelar
    // pelo tempo de resposta se o e-mail existe.
    const confere = await verificarSenha(
      validado.data.senha,
      usuario?.senha_hash || HASH_INEXISTENTE,
    )

    // A lista de acesso é a autoridade: um registro em `usuarios` sozinho não
    // basta para entrar (Art. 97º §1º).
    const naLista = usuario ? await autorizada(usuario.email) : false

    if (!usuario || !confere || !usuario.ativo || !naLista) {
      contabilizar(ip)
      await registrarAuditoria({
        usuario: validado.data.email,
        acao: 'login_negado',
        recurso: 'sessao',
        detalhe: !usuario
          ? 'usuario inexistente'
          : !confere
            ? 'senha incorreta'
            : !usuario.ativo
              ? 'usuario inativo'
              : 'fora da lista de acesso',
        ip,
      })
      return erro('E-mail ou senha incorretos.', 401)
    }

    limpar(ip)
    await criarSessao(usuario.id, {
      userAgent: request.headers.get('user-agent'),
      ip,
    })

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'login',
      recurso: 'sessao',
      ip,
    })

    return ok({
      usuario: {
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        diretoria: usuario.diretoria,
      },
    })
  } catch (e) {
    return tratarErro(e, 'auth/login')
  }
}
