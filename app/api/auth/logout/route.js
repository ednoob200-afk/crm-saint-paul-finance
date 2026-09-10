import {
  encerrarSessao,
  ipDaRequisicao,
  registrarAuditoria,
  sessaoAtual,
  verificarOrigem,
} from '@/lib/auth'
import { ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    verificarOrigem(request)
    const usuario = await sessaoAtual()
    await encerrarSessao()
    if (usuario) {
      await registrarAuditoria({
        usuario: usuario.email,
        papel: usuario.papel,
        acao: 'logout',
        recurso: 'sessao',
        ip: ipDaRequisicao(request),
      })
    }
    return ok({ encerrada: true })
  } catch (e) {
    return tratarErro(e, 'auth/logout')
  }
}
