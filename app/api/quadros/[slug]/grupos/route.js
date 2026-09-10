import {
  exigirPapel,
  exigirSessao,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { obterQuadro } from '@/lib/quadros'
import { criarGrupo, garantirGruposPadrao } from '@/lib/repositories/grupos'
import { grupoSchema } from '@/lib/validacao'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { slug } = await params
    await exigirSessao()
    if (!obterQuadro(slug)) return erro('Quadro inexistente.', 404)
    return ok({ grupos: await garantirGruposPadrao(slug) })
  } catch (e) {
    return tratarErro(e, 'quadros/grupos GET')
  }
}

export async function POST(request, { params }) {
  try {
    verificarOrigem(request)
    const { slug } = await params
    const usuario = await exigirPapel('diretor')
    if (!obterQuadro(slug)) return erro('Quadro inexistente.', 404)

    const corpo = await lerJson(request, 10_000)
    const validado = grupoSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }

    const grupo = await criarGrupo(slug, validado.data)

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'grupo_criado',
      recurso: `${slug}/${grupo.id}`,
      detalhe: grupo.nome,
      ip: ipDaRequisicao(request),
    })

    return ok({ grupo }, 201)
  } catch (e) {
    return tratarErro(e, 'quadros/grupos POST')
  }
}
