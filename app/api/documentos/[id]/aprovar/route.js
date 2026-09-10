/**
 * Aprovação humana e distribuição do documento triado.
 *
 * Este é o único ponto em que uma sugestão de IA se transforma em item de
 * quadro. Registra quem aprovou, quando, a sugestão original, a versão
 * editada e os artigos usados no roteamento (Art. 100º, Art. 110º).
 */

import {
  exigirPapel,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { obterDocumento, registrarAprovacao } from '@/lib/repositories/documentos'
import { criarItem } from '@/lib/repositories/itens'
import { garantirGruposPadrao } from '@/lib/repositories/grupos'
import { camposDoQuadro, obterQuadro, rotuloDiretoria, DIRETORIAS } from '@/lib/quadros'
import { rotuloCanonico } from '@/lib/estatuto'
import { sugestaoIaSchema, validarItem } from '@/lib/validacao'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Mapeia a sugestão revisada para os campos do quadro escolhido. */
function montarItem(quadro, sugestao, documento) {
  const chavesDoQuadro = new Set(
    camposDoQuadro(quadro)
      .map((c) => c.campo)
      .filter((c) => c.startsWith('dados.'))
      .map((c) => c.slice('dados.'.length)),
  )

  const dados = {}
  const talvez = (chave, valor) => {
    if (chavesDoQuadro.has(chave) && valor) dados[chave] = valor
  }
  talvez('organizacao', sugestao.organizacao)
  talvez('email', sugestao.email)
  talvez('email_institucional', sugestao.email)
  talvez('telefone', sugestao.telefone)

  const coResponsavelDiretoria = DIRETORIAS.find((d) => d.valor === sugestao.coResponsavel)

  return {
    titulo: sugestao.titulo || documento.nome,
    diretoria: sugestao.diretoriaCompetente || null,
    co_responsavel: coResponsavelDiretoria
      ? rotuloDiretoria(coResponsavelDiretoria.valor)
      : sugestao.coResponsavel || null,
    responsavel: sugestao.responsavelSugerido || null,
    prioridade: sugestao.prioridade,
    prazo: sugestao.prazo || null,
    confidencialidade: sugestao.confidencialidade,
    proximo_passo: sugestao.proximoPasso || null,
    risco: (sugestao.riscos || []).filter(Boolean).join('; ') || null,
    origem: `Triagem por IA — documento "${documento.nome}"`,
    descricao:
      [sugestao.resumo, sugestao.descricaoCompleta]
        .filter(Boolean)
        .join('\n\n')
        .trim() || null,
    artigos: (sugestao.artigosAplicaveis || [])
      .map((a) => ({ artigo: rotuloCanonico(a.artigo), justificativa: a.justificativa || '' }))
      .filter((a) => a.artigo),
    dados,
  }
}

export async function POST(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)

    // Distribuir é ato de gestão: exige pelo menos Diretor.
    const usuario = await exigirPapel('diretor')

    const documento = await obterDocumento(id, usuario)
    if (!documento) return erro('Documento não encontrado.', 404)
    if (documento.status === 'distribuido') {
      return erro('Este documento já foi aprovado e distribuído.', 409)
    }

    const corpo = await lerJson(request, 300_000)
    const validado = sugestaoIaSchema.safeParse(corpo?.sugestao)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: `sugestao.${i.path.join('.')}`,
          mensagem: i.message,
        })),
      )
    }
    const sugestao = validado.data

    const quadro = obterQuadro(sugestao.quadroDestino)
    if (!quadro) {
      return erroDeValidacao([
        {
          campo: 'sugestao.quadroDestino',
          mensagem: 'Escolha um quadro de destino válido antes de distribuir.',
        },
      ])
    }
    if (!sugestao.titulo) {
      return erroDeValidacao([
        { campo: 'sugestao.titulo', mensagem: 'Informe o título do item.' },
      ])
    }

    const grupos = await garantirGruposPadrao(quadro.slug)
    const grupo = grupos.find((g) => g.nome === sugestao.grupoDestino) || null

    const bruto = montarItem(quadro, sugestao, documento)
    const resultado = validarItem(quadro.slug, bruto)
    if (!resultado.ok) return erroDeValidacao(resultado.erros)

    const item = await criarItem(
      quadro.slug,
      {
        ...resultado.valor,
        grupo_id: grupo ? grupo.id : null,
        documento_id: documento.id,
      },
      usuario,
    )

    await registrarAprovacao(id, {
      itemId: item.id,
      sugestaoEditada: {
        ...sugestao,
        aprovadoPor: usuario.nome,
        aprovadoPorEmail: usuario.email,
        papelDoAprovador: usuario.papel,
        aprovadoEm: new Date().toISOString(),
        quadroDestino: quadro.slug,
        grupoDestino: grupo ? grupo.nome : null,
        artigosUsadosNoRoteamento: resultado.valor.artigos,
      },
      aprovadoPor: usuario.nome,
    })

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'documento_distribuido',
      recurso: `documentos/${id}`,
      detalhe: `item ${quadro.slug}/${item.id}: ${item.titulo}`,
      ip: ipDaRequisicao(request),
    })

    return ok({ item, quadro: quadro.slug }, 201)
  } catch (e) {
    return tratarErro(e, 'documentos/aprovar')
  }
}
