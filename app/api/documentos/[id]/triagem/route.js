/**
 * Triagem por IA de um documento já recebido.
 *
 * A IA apenas SUGERE. Nada é criado em quadro nenhum aqui: a distribuição
 * exige aprovação humana em /api/documentos/[id]/aprovar
 * (Art. 100º e Art. 110º).
 */

import {
  exigirPapel,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { obterDocumento, registrarSugestao } from '@/lib/repositories/documentos'
import { TIPOS_DOCUMENTO_IA, chaveConfigurada, triarDocumento } from '@/lib/ia'
import { erro, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMITE_ANEXO = 8 * 1024 * 1024

export async function POST(request, { params }) {
  try {
    verificarOrigem(request)
    const { id } = await params
    if (!UUID.test(id)) return erro('Identificador inválido.', 400)

    const usuario = await exigirPapel('colaborador')

    if (!chaveConfigurada()) {
      return erro(
        'A triagem por IA está indisponível: falta a variável de ambiente ANTHROPIC_API_KEY. ' +
          'Adicione a chave no projeto da Vercel e reimplante. Você pode classificar o documento ' +
          'manualmente enquanto isso.',
        503,
        { codigo: 'chave_ausente' },
      )
    }

    const documento = await obterDocumento(id, usuario, { comTexto: true })
    if (!documento) return erro('Documento não encontrado.', 404)
    if (documento.status === 'distribuido') {
      return erro('Este documento já foi aprovado e distribuído.', 409)
    }

    // PDF e imagem são lidos pelo próprio modelo; o arquivo vem do Blob.
    let anexo = null
    if (!documento.conteudo_texto && TIPOS_DOCUMENTO_IA[documento.tipo_arquivo]) {
      if (!documento.url) {
        return erro(
          'O arquivo original não está mais acessível. Reenvie o documento ou cole o texto.',
          409,
        )
      }
      const resposta = await fetch(documento.url, { cache: 'no-store' })
      if (!resposta.ok) {
        return erro('Não foi possível recuperar o arquivo do armazenamento.', 502)
      }
      const buffer = Buffer.from(await resposta.arrayBuffer())
      if (buffer.byteLength > LIMITE_ANEXO) {
        return erro(
          `O arquivo tem ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB e excede o limite de ` +
            `${LIMITE_ANEXO / 1024 / 1024} MB para triagem.`,
          413,
        )
      }
      anexo = { tipo: documento.tipo_arquivo, base64: buffer.toString('base64') }
    }

    if (!documento.conteudo_texto && !anexo) {
      return erro(
        'Não há conteúdo legível para triar. Cole o texto do documento.',
        400,
      )
    }

    let resultado
    try {
      resultado = await triarDocumento({
        nome: documento.nome,
        conteudo: documento.conteudo_texto,
        anexo,
      })
    } catch (falha) {
      // A falha é registrada no documento para que a diretoria veja o motivo.
      if (falha?.name === 'ErroIA') {
        await registrarSugestao(id, { sugestao: null, modelo: null, erro: falha.message })
      }
      throw falha
    }

    const atualizado = await registrarSugestao(id, {
      sugestao: { ...resultado.sugestao, _avisos: resultado.avisos, _truncado: resultado.truncado },
      modelo: resultado.modelo,
    })

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'triagem_ia',
      recurso: `documentos/${id}`,
      detalhe: `modelo ${resultado.modelo}; quadro sugerido ${resultado.sugestao.quadroDestino || 'nenhum'}`,
      ip: ipDaRequisicao(request),
    })

    return ok({
      documento: atualizado,
      sugestao: resultado.sugestao,
      avisos: resultado.avisos,
      truncado: resultado.truncado,
      modelo: resultado.modelo,
    })
  } catch (e) {
    return tratarErro(e, 'documentos/triagem')
  }
}
