import {
  exigirPapel,
  exigirSessao,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { descartarDocumento, obterDocumento } from '@/lib/repositories/documentos'
import { erro, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)
    const usuario = await exigirSessao()

    const documento = await obterDocumento(id, usuario, { comTexto: true })
    if (!documento) return erro('Documento não encontrado.', 404)

    return ok({ documento })
  } catch (e) {
    return tratarErro(e, 'documentos GET id')
  }
}

/**
 * Descarta a sugestão. O documento não é apagado: fica com status
 * "descartado", preservando o registro de que foi recebido e recusado.
 */
export async function DELETE(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)
    const usuario = await exigirPapel('colaborador')

    const descartado = await descartarDocumento(id, usuario)
    if (!descartado) {
      return erro('Documento não encontrado ou já distribuído.', 404)
    }

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'documento_descartado',
      recurso: `documentos/${id}`,
      ip: ipDaRequisicao(request),
    })

    return ok({ descartado: true })
  } catch (e) {
    return tratarErro(e, 'documentos DELETE')
  }
}
