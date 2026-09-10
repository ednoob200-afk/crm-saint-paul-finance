import { z } from 'zod'
import {
  exigirPapel,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import {
  atualizar,
  definirAtivo,
  obterPorId,
  regerarConvite,
  remover,
} from '@/lib/repositories/lista_acesso'
import { DIRETORIAS, NIVEL_PAPEL, PAPEIS } from '@/lib/quadros'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const atualizacaoSchema = z.object({
  papel: z.enum(PAPEIS.map((p) => p.valor)).optional(),
  diretoria: z
    .enum(DIRETORIAS.map((d) => d.valor))
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  observacao: z.string().trim().max(500).optional(),
  ativo: z.boolean().optional(),
  primeiroAcessoLivre: z.boolean().optional(),
  novoConvite: z.boolean().optional(),
})

export async function PATCH(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)

    const usuario = await exigirPapel('presidencia')

    const corpo = await lerJson(request, 10_000)
    const validado = atualizacaoSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }
    const alteracoes = validado.data

    const existente = await obterPorId(id)
    if (!existente) return erro('Entrada não encontrada.', 404)

    // Ninguém eleva papel acima do próprio, nem mexe na própria autorização.
    if (alteracoes.papel) {
      const nivelAtual = NIVEL_PAPEL[usuario.papel] || 0
      if ((NIVEL_PAPEL[alteracoes.papel] || 0) > nivelAtual) {
        return erro('Você não pode conceder um papel acima do seu.', 403)
      }
    }
    if (
      existente.email.toLowerCase() === usuario.email.toLowerCase() &&
      (alteracoes.papel || alteracoes.ativo === false)
    ) {
      return erro('Você não pode alterar o seu próprio papel nem revogar o seu próprio acesso.', 403)
    }

    let entrada = existente
    let linkAtivacao = null

    if (
      alteracoes.papel ||
      alteracoes.diretoria !== undefined ||
      alteracoes.observacao !== undefined ||
      alteracoes.primeiroAcessoLivre !== undefined
    ) {
      entrada = await atualizar(id, {
        papel: alteracoes.papel,
        diretoria: alteracoes.diretoria,
        observacao: alteracoes.observacao,
        primeiro_acesso_livre: alteracoes.primeiroAcessoLivre,
      })
    }

    if (alteracoes.ativo !== undefined) {
      entrada = await definirAtivo(id, alteracoes.ativo)
      if (!entrada) return erro('Entrada não encontrada.', 404)
    }

    if (alteracoes.novoConvite) {
      if (entrada.ativado_em) {
        return erro(
          'Esta pessoa já ativou o acesso. Para trocar a senha, revogue e adicione de novo.',
          409,
        )
      }
      const regerado = await regerarConvite(id)
      if (!regerado) return erro('Não foi possível gerar o convite: a entrada está revogada.', 409)
      const origem =
        request.headers.get('origin') ||
        (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') ||
        `https://${request.headers.get('host') || ''}`
      linkAtivacao = `${origem}/ativar?t=${regerado.token}`
      const { token, ...limpo } = regerado
      void token
      entrada = limpo
    }

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'lista_acesso_atualizada',
      recurso: `lista_acesso/${id}`,
      detalhe: `${entrada.email}: ${Object.keys(alteracoes).join(', ')}`,
      ip: ipDaRequisicao(request),
    })

    return ok({ entrada, linkAtivacao })
  } catch (e) {
    return tratarErro(e, 'lista-acesso PATCH')
  }
}

/** Remove apenas convite nunca ativado. Quem já entrou é revogado, não apagado. */
export async function DELETE(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)

    const usuario = await exigirPapel('presidencia')

    const existente = await obterPorId(id)
    if (!existente) return erro('Entrada não encontrada.', 404)

    if (existente.ativado_em) {
      return erro(
        'Esta pessoa já ativou o acesso e possui histórico no sistema. Use "Revogar acesso": ' +
          'o Art. 42º VIII e o Art. 72º parágrafo único exigem preservar a memória institucional.',
        409,
      )
    }

    const removido = await remover(id)
    if (!removido) return erro('Entrada não encontrada.', 404)

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'lista_acesso_removida',
      recurso: `lista_acesso/${id}`,
      detalhe: existente.email,
      ip: ipDaRequisicao(request),
    })

    return ok({ removido: true })
  } catch (e) {
    return tratarErro(e, 'lista-acesso DELETE')
  }
}
