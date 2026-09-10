import { exigirSessao } from '@/lib/auth'
import { historicoDoItem, obterItem } from '@/lib/repositories/itens'
import { erro, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)
    const usuario = await exigirSessao()

    // O histórico só é acessível a quem pode ver o item.
    const item = await obterItem(id, usuario)
    if (!item) return erro('Item não encontrado.', 404)

    return ok({ historico: await historicoDoItem(id) })
  } catch (e) {
    return tratarErro(e, 'itens/historico')
  }
}
