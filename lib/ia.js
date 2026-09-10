/**
 * Camada de IA. Executa exclusivamente no servidor.
 *
 * A chave nunca é exposta ao navegador, nunca entra em variável NEXT_PUBLIC_*
 * e nunca aparece em log. A ausência da chave produz erro legível, não falha
 * silenciosa nem simulação.
 *
 * O Estatuto inteiro vai no prefixo do system, marcado para cache de prompt.
 * Assim o modelo nunca precisa supor um artigo que não recebeu, e as chamadas
 * seguintes leem o Estatuto do cache em vez de pagá-lo de novo.
 *
 * Fundamento estatutário: Art. 100º (checagem humana, citação de fontes,
 * confidencialidade, responsabilidade final do autor) e Art. 108º a Art. 110º
 * (a IA é instrumento subordinado ao julgamento humano).
 */

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { obterArtigo, rotuloCanonico, textoCompletoDoEstatuto, VERSAO_ESTATUTO } from '@/lib/estatuto'
import {
  CONFIDENCIALIDADE,
  DIRETORIAS,
  DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS,
  QUADROS,
} from '@/lib/quadros'
import { sugestaoIaSchema } from '@/lib/validacao'

const MODELO_PADRAO = 'claude-opus-5'
const TEMPO_LIMITE_MS = 55_000

/** Tipos de arquivo que o modelo lê nativamente, sem extrator local. */
export const TIPOS_DOCUMENTO_IA = {
  'application/pdf': 'documento',
  'image/png': 'imagem',
  'image/jpeg': 'imagem',
  'image/gif': 'imagem',
  'image/webp': 'imagem',
}

export const TIPOS_TEXTO = ['text/plain', 'text/markdown', 'text/csv', 'application/json']

class ErroIA extends Error {
  constructor(mensagem, status = 502, codigo = 'erro_ia') {
    super(mensagem)
    this.name = 'ErroIA'
    this.status = status
    this.codigo = codigo
  }
}

export function chaveConfigurada() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function modeloEmUso() {
  return process.env.ANTHROPIC_MODEL || MODELO_PADRAO
}

function cliente() {
  if (!chaveConfigurada()) {
    throw new ErroIA(
      'A integração de IA não está configurada: falta a variável de ambiente ANTHROPIC_API_KEY. ' +
        'Adicione a chave no projeto da Vercel, em Settings e Environment Variables, e reimplante. ' +
        'Até então a triagem automática fica indisponível; o cadastro manual continua funcionando.',
      503,
      'chave_ausente',
    )
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: TEMPO_LIMITE_MS,
    maxRetries: 1,
  })
}

// ---------------------------------------------------------------------------
// Contexto institucional enviado ao modelo
// ---------------------------------------------------------------------------

function estruturaInstitucional() {
  const quadros = QUADROS.map(
    (q) =>
      `- ${q.slug} ("${q.nome}"): ${q.descricao} Grupos: ${(q.grupos || [])
        .map((g) => g.nome)
        .join('; ')}.`,
  ).join('\n')

  const diretorias = DIRETORIAS.map((d) => `- ${d.valor} = ${d.rotulo} (${d.artigo})`).join('\n')
  const naoInstituidas = DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS.map(
    (d) => `- ${d.rotulo}: ${d.situacao}. ${d.observacao}`,
  ).join('\n')

  return `## Diretorias instituídas e atribuíveis (use o valor da esquerda)
${diretorias}

## Diretorias previstas no Estatuto mas NÃO instituídas — nunca indique como competentes
${naoInstituidas}

## Quadros de destino disponíveis (use o slug)
${quadros}

## Níveis de confidencialidade, do menor para o maior
${CONFIDENCIALIDADE.map((c) => c.valor).join(' → ')}`
}

const RUBRICA = `## Rubrica inicial de roteamento — confirme cada linha contra o Estatuto acima
- Parceria ou patrocínio com recurso financeiro: institucional responsável, presidencia co-responsável (Art. 104º §1º e §3º, Art. 37º V).
- Material público, marca ou logotipo: comunicacao. Se mencionar a Escola de Negócios Saint Paul, aponte validação institucional pendente (Art. 91º, Art. 43º II).
- Currículo, inscrição ou avaliação de candidato: institucional, quadro processo-seletivo, confidencialidade "confidencial" (Art. 24º, Art. 42º IV, Art. 96º).
- Equity research, valuation, one-pager ou pitchbook: formacao, quadro producao; exija aviso educacional quando houver publicação (Art. 40º III, Art. 54º).
- Regulamento ou convite de challenge: formacao responsável, institucional co-responsável (Art. 59º e §3º).
- Ata, pauta ou proposta de alteração estatutária: quadro deliberacoes, identificando instância e quórum (Art. 67º, Art. 65º, Art. 112º).
- Avaliação de performance ou feedback 360: vice_presidencia, quadro avaliacao, confidencialidade "restrito" (Art. 39º VIII, Art. 80º).
- Orçamento, nota fiscal, reembolso ou proposta com valores: presidencia, quadro operacao, grupo "Orçamento e prestação de contas". NUNCA indique Diretoria Financeira (Art. 33º §2º, Art. 44º parágrafo único, Art. 88º).
- Convite de palestra, mentoria ou visita técnica: institucional, quadro parcerias; eventos co-responsável quando houver logística (Art. 102º, Art. 104º §2º).
- Sem encaixe claro: presidencia, registrando que é caso omisso e explicando a justificativa (Art. 120º II).`

/**
 * Prefixo estável do system: Estatuto integral e estrutura institucional.
 * Marcado com cache_control para que apenas a primeira chamada pague por ele.
 */
function prefixoEstatutario() {
  return {
    type: 'text',
    text: `# Estatuto Oficial da Saint Paul Finance — versão vigente: ${VERSAO_ESTATUTO}

Este é o texto integral do Estatuto. É a única fonte de artigos, competências, quóruns e prazos que você pode citar.

${textoCompletoDoEstatuto()}

# Estrutura institucional do sistema

${estruturaInstitucional()}

${RUBRICA}`,
    cache_control: { type: 'ephemeral' },
  }
}

function textoDaResposta(resposta) {
  return (resposta.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

/** Aceita JSON puro ou entre cercas de código. Nunca usa eval. */
function extrairJson(bruto) {
  const texto = String(bruto || '').trim()
  const cercado = texto.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidato = cercado ? cercado[1].trim() : texto

  const tentativas = [candidato]
  const inicio = candidato.indexOf('{')
  const fim = candidato.lastIndexOf('}')
  if (inicio !== -1 && fim > inicio) tentativas.push(candidato.slice(inicio, fim + 1))

  for (const tentativa of tentativas) {
    try {
      return JSON.parse(tentativa)
    } catch {
      // tenta o próximo formato
    }
  }
  throw new ErroIA(
    'O modelo respondeu em um formato que não pôde ser interpretado como JSON. ' +
      'Use "Reprocessar" ou preencha os campos manualmente.',
    502,
    'json_invalido',
  )
}

async function chamar({ instrucao, blocos, maxTokens = 4096, effort = 'medium' }) {
  const anthropic = cliente()
  try {
    const resposta = await anthropic.messages.create({
      model: modeloEmUso(),
      max_tokens: maxTokens,
      // Prefixo cacheado primeiro, instrução específica depois.
      system: [prefixoEstatutario(), { type: 'text', text: instrucao }],
      output_config: { effort },
      messages: [{ role: 'user', content: blocos }],
    })

    if (resposta.stop_reason === 'refusal') {
      throw new ErroIA(
        'O modelo recusou processar este conteúdo. Faça a classificação manualmente e, ' +
          'se for caso omisso, encaminhe à Presidência (Art. 120º II).',
        422,
        'recusa',
      )
    }
    return {
      texto: textoDaResposta(resposta),
      modelo: resposta.model,
      cache: {
        gravado: resposta.usage?.cache_creation_input_tokens ?? 0,
        lido: resposta.usage?.cache_read_input_tokens ?? 0,
      },
    }
  } catch (erro) {
    if (erro instanceof ErroIA) throw erro
    // Nada de stack trace nem corpo bruto do provedor chega ao cliente.
    console.error('[ia] falha na chamada:', erro?.status || '', erro?.message)
    if (erro?.status === 401 || erro?.status === 403) {
      throw new ErroIA(
        'A chave ANTHROPIC_API_KEY foi recusada pelo provedor. Verifique a chave configurada na Vercel.',
        503,
        'chave_invalida',
      )
    }
    if (erro?.status === 429) {
      throw new ErroIA(
        'Limite de uso da API de IA atingido. Tente novamente em alguns minutos.',
        429,
        'limite',
      )
    }
    if (erro?.status === 413 || erro?.status === 400) {
      throw new ErroIA(
        'O provedor recusou a requisição, normalmente por tamanho de arquivo. ' +
          'Reduza o documento e tente novamente.',
        413,
        'requisicao_invalida',
      )
    }
    if (erro?.name === 'APIConnectionTimeoutError' || /timeout/i.test(erro?.message || '')) {
      throw new ErroIA(
        'A triagem excedeu o tempo limite. Reduza o tamanho do documento e tente novamente.',
        504,
        'timeout',
      )
    }
    throw new ErroIA(
      'Não foi possível concluir a chamada de IA. Tente novamente ou preencha os campos manualmente.',
    )
  }
}

// ---------------------------------------------------------------------------
// Triagem de documentos
// ---------------------------------------------------------------------------

const LIMITE_CONTEUDO = 120_000

const INSTRUCAO_TRIAGEM = `Você apoia a Saint Paul Finance na triagem de documentos institucionais.

Sua função é SUGERIR um roteamento. A decisão é humana: uma pessoa autorizada revisa, edita e distribui. Nunca afirme que a distribuição foi feita.

Regras invioláveis:
1. Cite apenas artigos que constem do Estatuto fornecido no prefixo. Se não houver base suficiente, deixe "artigosAplicaveis" vazio e explique isso em "justificativaDoRoteamento". Jamais invente artigo, capítulo, inciso, competência, quórum ou prazo.
2. Nunca indique a Diretoria Financeira como competente: ela é prevista apenas "quando instituída" e a Liga não a instituiu.
3. Em "diretoriaCompetente" e "coResponsavel" use o valor da esquerda da lista de diretorias. Em "quadroDestino" use o slug. Em "grupoDestino" use exatamente um dos grupos listados para aquele quadro.
4. Separe fato estatutário de interpretação. Ao interpretar, escreva "interpretação:" antes da afirmação.
5. Português do Brasil, tom institucional e sóbrio, sem emojis e sem linguagem promocional.
6. Responda EXCLUSIVAMENTE com um objeto JSON válido, sem texto antes ou depois, sem cercas de código e sem comentários.

Formato exigido, com todos os campos preenchidos. String vazia quando não houver informação; null em "prazo" quando não houver data.

{
  "titulo": "",
  "tipo": "ata|decisao|tarefa|parceria|comunicacao|candidato|producao|evento|outro",
  "diretoriaCompetente": "",
  "coResponsavel": "",
  "quadroDestino": "",
  "grupoDestino": "",
  "resumo": "",
  "descricaoCompleta": "",
  "confidencialidade": "publico|interno|confidencial|restrito",
  "artigosAplicaveis": [{ "artigo": "", "justificativa": "" }],
  "prioridade": "baixa|media|alta|critica",
  "prazo": null,
  "proximoPasso": "",
  "organizacao": "",
  "email": "",
  "telefone": "",
  "responsavelSugerido": "",
  "riscos": [],
  "justificativaDoRoteamento": ""
}`

/**
 * Sugere a classificação de um documento.
 *
 * Aceita texto colado (`conteudo`) ou um arquivo que o modelo lê nativamente
 * (`anexo`: PDF ou imagem em base64). Não grava nada: quem grava é a rota, e
 * somente após aprovação humana.
 */
export async function triarDocumento({ nome, conteudo = null, anexo = null }) {
  const blocos = []
  let truncado = false

  if (anexo) {
    const categoria = TIPOS_DOCUMENTO_IA[anexo.tipo]
    if (!categoria) {
      throw new ErroIA(
        `Tipo de arquivo não suportado para leitura por IA: ${anexo.tipo}. ` +
          'Envie PDF, PNG, JPEG, GIF, WEBP, ou cole o texto do documento.',
        415,
        'tipo_nao_suportado',
      )
    }
    blocos.push(
      categoria === 'documento'
        ? {
            type: 'document',
            source: { type: 'base64', media_type: anexo.tipo, data: anexo.base64 },
          }
        : {
            type: 'image',
            source: { type: 'base64', media_type: anexo.tipo, data: anexo.base64 },
          },
    )
  }

  if (conteudo) {
    const recorte = String(conteudo).slice(0, LIMITE_CONTEUDO)
    truncado = String(conteudo).length > LIMITE_CONTEUDO
    blocos.push({
      type: 'text',
      text: `Conteúdo textual do documento:\n"""\n${recorte}\n"""`,
    })
  }

  if (blocos.length === 0) {
    throw new ErroIA('Nada a triar: envie um arquivo ou cole o texto.', 400, 'sem_conteudo')
  }

  blocos.push({
    type: 'text',
    text:
      `Nome do arquivo: ${nome}\n` +
      (truncado ? `Aviso: o texto foi truncado em ${LIMITE_CONTEUDO} caracteres.\n` : '') +
      'Classifique este documento e responda apenas com o JSON exigido.',
  })

  const { texto, modelo, cache } = await chamar({
    instrucao: INSTRUCAO_TRIAGEM,
    blocos,
    maxTokens: 4096,
    effort: 'medium',
  })

  const validado = sugestaoIaSchema.safeParse(extrairJson(texto))

  if (!validado.success) {
    throw new ErroIA(
      'A sugestão da IA não passou na validação de formato: ' +
        validado.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join('.') || 'raiz'}: ${i.message}`)
          .join('; ') +
        '. Use "Reprocessar" ou classifique manualmente.',
      502,
      'sugestao_invalida',
    )
  }

  const sugestao = validado.data

  // Descarta artigo inexistente em vez de repassar invenção adiante.
  const artigosVerificados = []
  const artigosDescartados = []
  for (const referencia of sugestao.artigosAplicaveis) {
    const canonico = rotuloCanonico(referencia.artigo)
    if (canonico) {
      artigosVerificados.push({ artigo: canonico, justificativa: referencia.justificativa })
    } else if (referencia.artigo) {
      artigosDescartados.push(referencia.artigo)
    }
  }

  const quadro = QUADROS.find((q) => q.slug === sugestao.quadroDestino) || null
  const diretoria =
    DIRETORIAS.find(
      (d) => d.valor === sugestao.diretoriaCompetente || d.rotulo === sugestao.diretoriaCompetente,
    ) || null
  const coResponsavel =
    DIRETORIAS.find(
      (d) => d.valor === sugestao.coResponsavel || d.rotulo === sugestao.coResponsavel,
    ) || null

  const grupoValido =
    quadro && (quadro.grupos || []).some((g) => g.nome === sugestao.grupoDestino)

  const avisos = []
  if (artigosDescartados.length > 0) {
    avisos.push(
      `Referência(s) descartada(s) por não existir(em) no Estatuto vigente: ${artigosDescartados.join(', ')}.`,
    )
  }
  if (!quadro) {
    avisos.push(
      `O quadro sugerido ("${sugestao.quadroDestino || 'não informado'}") não existe. Escolha o quadro na revisão.`,
    )
  } else if (!grupoValido && sugestao.grupoDestino) {
    avisos.push(
      `O grupo sugerido ("${sugestao.grupoDestino}") não existe no quadro ${quadro.nome}. Escolha o grupo na revisão.`,
    )
  }
  if (!diretoria) {
    avisos.push(
      `A diretoria sugerida ("${sugestao.diretoriaCompetente || 'não informada'}") não corresponde a uma ` +
        'diretoria instituída. Selecione a diretoria na revisão.',
    )
  }
  if (quadro && !(quadro.statusOpcoes || []).length) {
    avisos.push('O quadro sugerido não possui status configurado.')
  }

  return {
    sugestao: {
      ...sugestao,
      artigosAplicaveis: artigosVerificados,
      diretoriaCompetente: diretoria ? diretoria.valor : '',
      coResponsavel: coResponsavel ? coResponsavel.valor : '',
      quadroDestino: quadro ? quadro.slug : '',
      grupoDestino: grupoValido ? sugestao.grupoDestino : '',
    },
    avisos,
    truncado,
    modelo,
    cache,
  }
}

// ---------------------------------------------------------------------------
// Pergunta em linguagem natural sobre o Estatuto
// ---------------------------------------------------------------------------

const respostaEstatutoSchema = z.object({
  resposta: z.string().trim().max(6000),
  fatosEstatutarios: z.array(z.string().trim().max(1500)).max(20).default([]),
  interpretacao: z.string().trim().max(3000).default(''),
  artigosCitados: z.array(z.string().trim().max(120)).max(25).default([]),
  baseSuficiente: z.boolean(),
  observacao: z.string().trim().max(2000).default(''),
})

const INSTRUCAO_ESTATUTO = `Você responde perguntas sobre o Estatuto Oficial da Saint Paul Finance.

Regras invioláveis:
1. Use exclusivamente o Estatuto fornecido no prefixo. Nenhuma outra fonte, nenhum conhecimento externo, nenhuma analogia com outras entidades.
2. Cite os artigos que sustentam a resposta no formato "Art. 42º".
3. Separe explicitamente fato estatutário de interpretação: fatos em "fatosEstatutarios", leitura própria em "interpretacao".
4. Se o Estatuto não bastar, defina "baseSuficiente": false, explique o que falta e recomende encaminhar à Presidência como caso omisso (Art. 120º II).
5. Jamais invente artigo, parágrafo, inciso, competência, quórum ou prazo.
6. Português do Brasil, tom institucional e sóbrio.
7. Responda EXCLUSIVAMENTE com JSON válido, sem texto ao redor e sem cercas de código.

Formato exigido:

{
  "resposta": "",
  "fatosEstatutarios": [],
  "interpretacao": "",
  "artigosCitados": [],
  "baseSuficiente": true,
  "observacao": ""
}`

export async function perguntarAoEstatuto(pergunta) {
  const { texto, modelo, cache } = await chamar({
    instrucao: INSTRUCAO_ESTATUTO,
    blocos: [{ type: 'text', text: `Pergunta: ${pergunta}` }],
    maxTokens: 3000,
    effort: 'medium',
  })

  const validado = respostaEstatutoSchema.safeParse(extrairJson(texto))
  if (!validado.success) {
    throw new ErroIA(
      'A resposta da IA não passou na validação de formato. Reformule a pergunta ou consulte a lista de artigos.',
      502,
      'resposta_invalida',
    )
  }

  const dados = validado.data
  const citados = []
  const inexistentes = []
  for (const referencia of dados.artigosCitados) {
    const artigo = obterArtigo(referencia)
    if (artigo) {
      if (!citados.some((c) => c.rotulo === artigo.rotulo)) {
        citados.push({
          rotulo: artigo.rotulo,
          numero: artigo.numero,
          capitulo: artigo.capitulo,
          capituloTitulo: artigo.capituloTitulo,
          texto: artigo.texto,
        })
      }
    } else if (referencia) {
      inexistentes.push(referencia)
    }
  }

  return { ...dados, artigosCitados: citados, artigosInexistentes: inexistentes, modelo, cache }
}

export { ErroIA }
