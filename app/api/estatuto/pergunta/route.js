import { exigirSessao, ipDaRequisicao, registrarAuditoria, verificarOrigem } from '@/lib/auth'
import { perguntarAoEstatuto } from '@/lib/ia'
import { perguntaEstatutoSchema } from '@/lib/validacao'
import { erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'
// A chamada de IA pode levar dezenas de segundos.
export const maxDuration = 60

export async function POST(request) {
  try {
    verificarOrigem(request)
    const usuario = await exigirSessao()

    const corpo = await lerJson(request, 20_000)
    const validado = perguntaEstatutoSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'pergunta',
          mensagem: i.message,
        })),
      )
    }

    const resposta = await perguntarAoEstatuto(validado.data.pergunta)

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'consulta_estatuto_ia',
      recurso: 'estatuto',
      detalhe: validado.data.pergunta.slice(0, 300),
      ip: ipDaRequisicao(request),
    })

    return ok(resposta)
  } catch (e) {
    return tratarErro(e, 'estatuto/pergunta')
  }
}
