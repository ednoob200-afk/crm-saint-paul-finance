/**
 * Provedor de IA: Anthropic.
 *
 * Mantido para que a Liga possa trocar de provedor sem reescrever a camada de
 * triagem. Aqui há cache de prompt, então o Estatuto integral pode ir no
 * prefixo do system, e o modelo lê PDF e imagem nativamente.
 */

import Anthropic from '@anthropic-ai/sdk'

const MODELO_PADRAO = 'claude-opus-5'
const TEMPO_LIMITE_MS = 55_000

export const NOME = 'anthropic'
export const ROTULO = 'Anthropic'
export const TEM_CACHE_DE_PROMPT = true
export const LE_PDF = true
export const LE_IMAGEM = true

export function chaveConfigurada() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function modelo() {
  return process.env.ANTHROPIC_MODEL || MODELO_PADRAO
}

function faltaChave() {
  const erro = new Error(
    'A integração de IA não está configurada: falta a variável de ambiente ANTHROPIC_API_KEY. ' +
      'Adicione a chave no projeto da Vercel, em Settings e Environment Variables, e reimplante. ' +
      'Até então a triagem automática fica indisponível; o cadastro manual continua funcionando.',
  )
  erro.status = 503
  erro.codigo = 'chave_ausente'
  return erro
}

export async function chamar({
  sistema,
  texto,
  imagem = null,
  documentoPdf = null,
  maxTokens = 4096,
  cachearSistema = true,
}) {
  if (!chaveConfigurada()) throw faltaChave()

  const cliente = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: TEMPO_LIMITE_MS,
    maxRetries: 1,
  })

  const blocos = []
  if (documentoPdf) {
    blocos.push({
      type: 'document',
      source: { type: 'base64', media_type: documentoPdf.tipo, data: documentoPdf.base64 },
    })
  }
  if (imagem) {
    blocos.push({
      type: 'image',
      source: { type: 'base64', media_type: imagem.tipo, data: imagem.base64 },
    })
  }
  blocos.push({ type: 'text', text: texto })

  try {
    const resposta = await cliente.messages.create({
      model: modelo(),
      max_tokens: maxTokens,
      system: [
        cachearSistema
          ? { type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }
          : { type: 'text', text: sistema },
      ],
      output_config: { effort: 'medium' },
      messages: [{ role: 'user', content: blocos }],
    })

    if (resposta.stop_reason === 'refusal') {
      const erro = new Error(
        'O modelo recusou processar este conteúdo. Faça a classificação manualmente e, ' +
          'se for caso omisso, encaminhe à Presidência (Art. 120º II).',
      )
      erro.status = 422
      erro.codigo = 'recusa'
      throw erro
    }

    return {
      texto: (resposta.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim(),
      modelo: resposta.model,
      cache: {
        gravado: resposta.usage?.cache_creation_input_tokens ?? 0,
        lido: resposta.usage?.cache_read_input_tokens ?? 0,
      },
    }
  } catch (falha) {
    if (falha?.codigo) throw falha
    console.error('[ia/anthropic] falha na chamada:', falha?.status || '', falha?.message)

    const erro = new Error(
      'Não foi possível concluir a chamada de IA. Tente novamente ou preencha os campos manualmente.',
    )
    erro.status = 502
    erro.codigo = 'erro_ia'

    if (falha?.status === 401 || falha?.status === 403) {
      erro.message =
        'A chave ANTHROPIC_API_KEY foi recusada pelo provedor. Verifique a chave configurada na Vercel.'
      erro.status = 503
      erro.codigo = 'chave_invalida'
    } else if (falha?.status === 429) {
      erro.message = 'Limite de uso da API de IA atingido. Tente novamente em alguns minutos.'
      erro.status = 429
      erro.codigo = 'limite'
    } else if (falha?.status === 413 || falha?.status === 400) {
      erro.message =
        'O provedor recusou a requisição, normalmente por tamanho de arquivo. ' +
        'Reduza o documento e tente novamente.'
      erro.status = 413
      erro.codigo = 'requisicao_invalida'
    } else if (
      falha?.name === 'APIConnectionTimeoutError' ||
      /timeout/i.test(falha?.message || '')
    ) {
      erro.message =
        'A chamada de IA excedeu o tempo limite. Reduza o tamanho do conteúdo e tente novamente.'
      erro.status = 504
      erro.codigo = 'timeout'
    }

    throw erro
  }
}
