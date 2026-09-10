import {
  exigirPapel,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { atualizarUsuario, revogarSessoes } from '@/lib/repositories/usuarios'
import { NIVEL_PAPEL } from '@/lib/quadros'
import { usuarioAtualizacaoSchema } from '@/lib/validacao'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)

    const usuario = await exigirPapel('presidencia')

    const corpo = await lerJson(request, 20_000)
    const validado = usuarioAtualizacaoSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }

    const alteracoes = validado.data

    // Nenhum usuário eleva a si mesmo, nem cria papel acima do próprio.
    if (alteracoes.papel) {
      const nivelAtual = NIVEL_PAPEL[usuario.papel] || 0
      const nivelDesejado = NIVEL_PAPEL[alteracoes.papel] || 0
      if (nivelDesejado > nivelAtual) {
        return erro('Você não pode conceder um papel acima do seu.', 403)
      }
      if (id === usuario.id) {
        return erro('Você não pode alterar o seu próprio papel.', 403)
      }
    }
    if (alteracoes.ativo === false && id === usuario.id) {
      return erro('Você não pode desativar o seu próprio acesso.', 403)
    }

    const atualizado = await atualizarUsuario(id, alteracoes)
    if (!atualizado) return erro('Usuário não encontrado ou nada a alterar.', 404)

    // Troca de papel, de senha ou desativação invalida sessões abertas.
    if (alteracoes.papel || alteracoes.senha || alteracoes.ativo === false) {
      await revogarSessoes(id)
    }

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'usuario_atualizado',
      recurso: `usuarios/${id}`,
      detalhe: Object.keys(alteracoes)
        .filter((k) => k !== 'senha')
        .concat(alteracoes.senha ? ['senha redefinida'] : [])
        .join(', '),
      ip: ipDaRequisicao(request),
    })

    return ok({ usuario: atualizado })
  } catch (e) {
    return tratarErro(e, 'usuarios PATCH')
  }
}
