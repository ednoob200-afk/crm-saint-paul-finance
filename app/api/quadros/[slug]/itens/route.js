import {
  exigirPapel,
  exigirSessao,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { obterQuadro } from '@/lib/quadros'
import { criarItem, listarItens } from '@/lib/repositories/itens'
import { garantirGruposPadrao } from '@/lib/repositories/grupos'
import { validarItem } from '@/lib/validacao'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const usuario = await exigirSessao()

    const quadro = obterQuadro(slug)
    if (!quadro) return erro('Quadro inexistente.', 404)

    const url = new URL(request.url)
    const filtros = {
      status: url.searchParams.get('status') || null,
      diretoria: url.searchParams.get('diretoria') || null,
      responsavel: url.searchParams.get('responsavel') || null,
      grupo_id: url.searchParams.get('grupo') || null,
      prazo: url.searchParams.get('prazo') || null,
      busca: (url.searchParams.get('busca') || '').trim().slice(0, 120) || null,
    }

    const [grupos, itens] = await Promise.all([
      garantirGruposPadrao(slug),
      listarItens(slug, usuario, filtros),
    ])

    return ok({ grupos, itens })
  } catch (e) {
    return tratarErro(e, 'quadros/itens GET')
  }
}

export async function POST(request, { params }) {
  try {
    verificarOrigem(request)
    const { slug } = await params
    const usuario = await exigirPapel('colaborador')

    const quadro = obterQuadro(slug)
    if (!quadro) return erro('Quadro inexistente.', 404)

    const corpo = await lerJson(request, 300_000)
    const resultado = validarItem(slug, corpo)
    if (!resultado.ok) return erroDeValidacao(resultado.erros)

    // Garante que o grupo padrão exista antes de referenciá-lo.
    await garantirGruposPadrao(slug)

    const item = await criarItem(slug, resultado.valor, usuario)

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'item_criado',
      recurso: `${slug}/${item.id}`,
      detalhe: item.titulo,
      ip: ipDaRequisicao(request),
    })

    return ok({ item }, 201)
  } catch (e) {
    return tratarErro(e, 'quadros/itens POST')
  }
}
