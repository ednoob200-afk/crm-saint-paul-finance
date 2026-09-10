/**
 * Provedor de IA: Groq.
 *
 * API compatível com a da OpenAI, chamada por HTTP direto para não adicionar
 * dependência. A chave nunca sai do servidor.
 *
 * Diferenças que a camada acima precisa respeitar:
 * - não há cache de prompt, então o contexto do Estatuto vai por busca de
 *   artigos relevantes, e não integral;
 * - modelos de texto não leem PDF;
 * - o modo JSON exige que a palavra "JSON" apareça no prompt.
 */

const ENDERECO = 'https://api.groq.com/openai/v1/chat/completions'
const MODELO_PADRAO = 'llama-3.3-70b-versatile'
const TEMPO_LIMITE_MS = 55_000

export const NOME = 'groq'
export const ROTULO = 'Groq'

/** A Groq não oferece cache de prompt: o contexto precisa ser enxuto. */
export const TEM_CACHE_DE_PROMPT = false

/** Modelos de texto da Groq não leem PDF. */
export const LE_PDF = false

/** Visão depende do modelo configurado; a camada acima avisa quando falha. */
export const LE_IMAGEM = true

export function chaveConfigurada() {
  return Boolean(process.env.GROQ_API_KEY)
}

export function modelo() {
  return process.env.GROQ_MODEL || MODELO_PADRAO
}

function faltaChave() {
  const erro = new Error(
    'A integração de IA não está configurada: falta a variável de ambiente GROQ_API_KEY. ' +
      'Adicione a chave no projeto da Vercel, em Settings e Environment Variables, e reimplante. ' +
      'Até então a triagem automática fica indisponível; o cadastro manual continua funcionando.',
  )
  erro.status = 503
  erro.codigo = 'chave_ausente'
  return erro
}

/**
 * Monta o conteúdo da mensagem do usuário. Texto puro quando não há imagem;
 * lista de partes quando há, no formato de `image_url` com data URI.
 */
function conteudoDoUsuario({ texto, imagem }) {
  if (!imagem) return texto
  return [
    { type: 'text', text: texto },
    {
      type: 'image_url',
      image_url: { url: `data:${imagem.tipo};base64,${imagem.base64}` },
    },
  ]
}

function mensagemDeErro(status, corpo) {
  const detalhe = corpo?.error?.message || ''

  if (status === 401 || status === 403) {
    return {
      texto:
        'A chave GROQ_API_KEY foi recusada pelo provedor. Verifique a chave configurada na Vercel.',
      status: 503,
      codigo: 'chave_invalida',
    }
  }
  if (status === 404 && /model/i.test(detalhe)) {
    return {
      texto:
        `O modelo "${modelo()}" não está disponível para esta chave. ` +
        'Defina a variável GROQ_MODEL com um modelo que sua conta possa usar.',
      status: 503,
      codigo: 'modelo_indisponivel',
    }
  }
  if (status === 413 || /too large|context length|tokens/i.test(detalhe)) {
    return {
      texto:
        'O conteúdo excedeu o limite do modelo. Reduza o tamanho do documento e tente novamente.',
      status: 413,
      codigo: 'conteudo_grande',
    }
  }
  if (status === 429) {
    return {
      texto:
        'Limite de uso da API de IA atingido. No plano gratuito da Groq o limite é por minuto: ' +
        'aguarde um instante e tente novamente.',
      status: 429,
      codigo: 'limite',
    }
  }
  if (status >= 500) {
    return {
      texto: 'O provedor de IA está indisponível neste momento. Tente novamente em instantes.',
      status: 502,
      codigo: 'provedor_indisponivel',
    }
  }
  return {
    texto: 'Não foi possível concluir a chamada de IA. Tente novamente ou preencha os campos manualmente.',
    status: 502,
    codigo: 'erro_ia',
  }
}

export async function chamar({ sistema, texto, imagem = null, maxTokens = 4096 }) {
  if (!chaveConfigurada()) throw faltaChave()

  const corpo = {
    model: modelo(),
    messages: [
      { role: 'system', content: sistema },
      { role: 'user', content: conteudoDoUsuario({ texto, imagem }) },
    ],
    max_completion_tokens: maxTokens,
    // Extração estruturada: baixa temperatura para reduzir variação de formato.
    temperature: 0.2,
    stream: false,
  }

  // O modo JSON nativo não é aceito junto com imagem em parte dos modelos.
  // Sem ele, a instrução no prompt e a validação com Zod seguem valendo.
  if (!imagem) corpo.response_format = { type: 'json_object' }

  let resposta
  try {
    resposta = await fetch(ENDERECO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      cache: 'no-store',
    })
  } catch (falha) {
    // Nada de corpo bruto do provedor no log, apenas o essencial.
    console.error('[ia/groq] falha de rede:', falha?.name, falha?.message)
    const erro = new Error(
      falha?.name === 'TimeoutError' || falha?.name === 'AbortError'
        ? 'A chamada de IA excedeu o tempo limite. Reduza o tamanho do conteúdo e tente novamente.'
        : 'Não foi possível alcançar o provedor de IA. Verifique a conexão e tente novamente.',
    )
    erro.status = 504
    erro.codigo = 'timeout'
    throw erro
  }

  if (!resposta.ok) {
    const conteudo = await resposta.json().catch(() => null)
    console.error('[ia/groq] resposta', resposta.status, conteudo?.error?.code || '')
    const { texto: mensagem, status, codigo } = mensagemDeErro(resposta.status, conteudo)
    const erro = new Error(mensagem)
    erro.status = status
    erro.codigo = codigo
    throw erro
  }

  const dados = await resposta.json()
  const escolha = dados.choices?.[0]

  if (escolha?.finish_reason === 'length') {
    console.warn('[ia/groq] resposta truncada por limite de tokens')
  }

  return {
    texto: (escolha?.message?.content || '').trim(),
    modelo: dados.model || modelo(),
    cache: { gravado: 0, lido: 0 },
  }
}
