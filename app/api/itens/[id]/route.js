import {
  exigirPapel,
  exigirSessao,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { atualizarItem, excluirItem, obterItem } from '@/lib/repositories/itens'
import { validarItem } from '@/lib/validacao'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)
    const usuario = await exigirSessao()

    const item = await obterItem(id, usuario)
    // Item confidencial acima do papel do usuário responde 404, e não 403,
    // para não confirmar sua existência (Art. 97º §1º).
    if (!item) return erro('Item não encontrado.', 404)

    return ok({ item })
  } catch (e) {
    return tratarErro(e, 'itens GET')
  }
}

export async function PATCH(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)
    const usuario = await exigirPapel('colaborador')

    const atual = await obterItem(id, usuario)
    if (!atual) return erro('Item não encontrado.', 404)

    const corpo = await lerJson(request, 300_000)
    const resultado = validarItem(atual.quadro, corpo, { parcial: true })
    if (!resultado.ok) return erroDeValidacao(resultado.erros)

    // `dados` chega parcial da edição inline: mescla com o que já existe para
    // não apagar campos que a tela não enviou.
    const alteracoes = { ...resultado.valor }
    if (alteracoes.dados !== undefined) {
      alteracoes.dados = { ...atual.dados, ...alteracoes.dados }
    }

    const item = await atualizarItem(id, alteracoes, usuario)
    if (!item) return erro('Item não encontrado.', 404)

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'item_atualizado',
      recurso: `${atual.quadro}/${id}`,
      detalhe: Object.keys(alteracoes).join(', '),
      ip: ipDaRequisicao(request),
    })

    return ok({ item })
  } catch (e) {
    return tratarErro(e, 'itens PATCH')
  }
}

export async function DELETE(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)
    const usuario = await exigirPapel('diretor')

    const atual = await obterItem(id, usuario)
    if (!atual) return erro('Item não encontrado.', 404)

    // O Art. 42º VIII e o Art. 72º parágrafo único mandam preservar a memória
    // institucional. Pessoas não são apagadas: são marcadas como desligadas.
    if (atual.quadro === 'membros') {
      return erro(
        'Registros de pessoas não são excluídos. Altere a situação para "Desligado" ou "Alumni": ' +
          'o Art. 42º VIII e o Art. 72º parágrafo único exigem preservar a memória institucional.',
        409,
      )
    }

    const excluido = await excluirItem(id, usuario)
    if (!excluido) return erro('Item não encontrado.', 404)

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'item_excluido',
      recurso: `${atual.quadro}/${id}`,
      detalhe: atual.titulo,
      ip: ipDaRequisicao(request),
    })

    return ok({ excluido: true })
  } catch (e) {
    return tratarErro(e, 'itens DELETE')
  }
}
