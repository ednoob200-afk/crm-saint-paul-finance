/**
 * Ativação de convite. Rota pública, protegida pelo próprio token: a pessoa
 * define a própria senha, de modo que nenhuma senha precise ser distribuída
 * por mensagem nem seja conhecida por terceiros.
 */

import { z } from 'zod'
import {
  criarSessao,
  ipDaRequisicao,
  registrarAuditoria,
  segredoConfigurado,
  verificarOrigem,
} from '@/lib/auth'
import { ativarConvite, obterPorToken } from '@/lib/repositories/lista_acesso'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const ativacaoSchema = z.object({
  token: z.string().trim().min(20).max(200),
  nome: z.string().trim().min(2, 'Informe seu nome completo.').max(160),
  senha: z.string().min(12, 'A senha deve ter pelo menos 12 caracteres.').max(300),
})

const MENSAGEM_INVALIDO =
  'Este convite não é válido: pode ter expirado, já ter sido usado ou ter sido revogado. ' +
  'Peça um novo link à Presidência.'

export async function POST(request) {
  try {
    verificarOrigem(request)

    if (!segredoConfigurado()) {
      return erro(
        'A variável AUTH_SECRET não está configurada. A ativação fica indisponível até que ela seja definida.',
        503,
      )
    }

    const corpo = await lerJson(request, 10_000)
    const validado = ativacaoSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }

    const { token, nome, senha } = validado.data

    // Confere antes de derivar o hash da senha, que é operação custosa.
    const convite = await obterPorToken(token)
    if (!convite) return erro(MENSAGEM_INVALIDO, 410, { codigo: 'convite_invalido' })

    const resultado = await ativarConvite(token, { nome, senha })

    if (!resultado.ok) {
      if (resultado.motivo === 'usuario_existente') {
        return erro(
          'Já existe um acesso com este e-mail. Use a tela de acesso ou peça a redefinição à Presidência.',
          409,
        )
      }
      return erro(MENSAGEM_INVALIDO, 410, { codigo: 'convite_invalido' })
    }

    // Entra direto: a pessoa acabou de provar que controla o link e definiu a senha.
    await criarSessao(resultado.usuario.id, {
      userAgent: request.headers.get('user-agent'),
      ip: ipDaRequisicao(request),
    })

    await registrarAuditoria({
      usuario: resultado.usuario.email,
      papel: resultado.usuario.papel,
      acao: 'acesso_ativado',
      recurso: 'lista_acesso',
      detalhe: `convite ativado como ${resultado.usuario.papel}`,
      ip: ipDaRequisicao(request),
    })

    return ok({
      usuario: {
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        papel: resultado.usuario.papel,
      },
    })
  } catch (e) {
    return tratarErro(e, 'ativar')
  }
}
