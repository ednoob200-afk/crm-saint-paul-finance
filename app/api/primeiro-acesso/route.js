/**
 * Primeiro acesso direto.
 *
 * Quem está na lista de acesso informa o e-mail autorizado e cria a própria
 * senha. Nenhuma senha é distribuída por mensagem e ninguém, nem a
 * Presidência, conhece a senha de outra pessoa.
 *
 * A resposta de falha é sempre a mesma, para não revelar quem está na lista.
 * A ativação é registrada na trilha de auditoria com o IP de origem, de modo
 * que uma ativação indevida fique visível e possa ser revogada.
 */

import { z } from 'zod'
import {
  criarSessao,
  ipDaRequisicao,
  registrarAuditoria,
  segredoConfigurado,
  verificarOrigem,
} from '@/lib/auth'
import { ativarPrimeiroAcesso } from '@/lib/repositories/lista_acesso'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const REGEX_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .regex(REGEX_EMAIL, 'Informe um e-mail válido.'),
  nome: z.string().trim().min(2, 'Informe seu nome completo.').max(160),
  senha: z.string().min(12, 'A senha deve ter pelo menos 12 caracteres.').max(300),
})

const MENSAGEM_GENERICA =
  'Não foi possível concluir o primeiro acesso. Ou este e-mail não está na lista de acesso, ou o ' +
  'acesso já foi ativado, ou esta entrada exige link de convite. Procure a Presidência.'

/** Limitação simples por IP, para não permitir varredura de e-mails. */
const TENTATIVAS = new Map()
const JANELA_MS = 15 * 60 * 1000
const MAXIMO = 8

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

export async function POST(request) {
  try {
    verificarOrigem(request)

    if (!segredoConfigurado()) {
      return erro(
        'A variável AUTH_SECRET não está configurada. O primeiro acesso fica indisponível até que ela seja definida.',
        503,
      )
    }

    const ip = ipDaRequisicao(request)
    if (excedeu(ip)) {
      return erro('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429)
    }

    const corpo = await lerJson(request, 10_000)
    const validado = schema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }

    const { email, nome, senha } = validado.data
    const resultado = await ativarPrimeiroAcesso(email, { nome, senha, ip })

    if (!resultado.ok) {
      contabilizar(ip)
      await registrarAuditoria({
        usuario: email,
        acao: 'primeiro_acesso_negado',
        recurso: 'lista_acesso',
        detalhe: resultado.motivo,
        ip,
      })
      return erro(MENSAGEM_GENERICA, 403, { codigo: 'nao_autorizado' })
    }

    await criarSessao(resultado.usuario.id, {
      userAgent: request.headers.get('user-agent'),
      ip,
    })

    await registrarAuditoria({
      usuario: resultado.usuario.email,
      papel: resultado.usuario.papel,
      acao: 'primeiro_acesso_ativado',
      recurso: 'lista_acesso',
      detalhe: `senha criada pela própria pessoa; papel ${resultado.usuario.papel}`,
      ip,
    })

    return ok({
      usuario: {
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        papel: resultado.usuario.papel,
      },
    })
  } catch (e) {
    return tratarErro(e, 'primeiro-acesso')
  }
}
