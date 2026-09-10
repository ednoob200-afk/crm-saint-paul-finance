/**
 * Camada de IA. Executa exclusivamente no servidor.
 *
 * A chave nunca é exposta ao navegador, nunca entra em variável NEXT_PUBLIC_*
 * e nunca aparece em log. A ausência da chave produz erro legível, não falha
 * silenciosa nem simulação.
 *
 * O provedor concreto fica em lib/provedores-ia. Esta camada decide **quanto**
 * do Estatuto enviar: com cache de prompt, o texto integral, de modo que o
 * modelo nunca precise supor um artigo que não recebeu; sem cache, apenas os
 * artigos relevantes, para não reenviar o Estatuto inteiro a cada chamada.
 *
 * Fundamento estatutário: Art. 100º (checagem humana, citação de fontes,
 * confidencialidade, responsabilidade final do autor) e Art. 108º a Art. 110º
 * (a IA é instrumento subordinado ao julgamento humano).
 */

import { z } from 'zod'
import {
  ARTIGOS,
  VERSAO_ESTATUTO,
  artigosRelevantes,
  contextoDeArtigos,
  obterArtigo,
  rotuloCanonico,
  textoCompletoDoEstatuto,
} from '@/lib/estatuto'
import {
  CONFIDENCIALIDADE,
  DIRETORIAS,
  DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS,
  QUADROS,
} from '@/lib/quadros'
import { sugestaoIaSchema } from '@/lib/validacao'
import * as groq from '@/lib/provedores-ia/groq'
import * as anthropic from '@/lib/provedores-ia/anthropic'

const PROVEDORES = { groq, anthropic }

class ErroIA extends Error {
  constructor(mensagem, status = 502, codigo = 'erro_ia') {
    super(mensagem)
    this.name = 'ErroIA'
    this.status = status
    this.codigo = codigo
  }
}

/**
 * Provedor em uso. `IA_PROVEDOR` decide explicitamente; sem ela, vale a chave
 * que estiver configurada. Assim trocar de provedor é trocar de variável.
 */
export function provedor() {
  const escolhido = (process.env.IA_PROVEDOR || '').trim().toLowerCase()
  if (escolhido && PROVEDORES[escolhido]) return PROVEDORES[escolhido]
  if (anthropic.chaveConfigurada()) return anthropic
  if (groq.chaveConfigurada()) return groq
  // Nenhuma chave: devolve o provedor padrão para que a mensagem de erro
  // nomeie a variável que falta.
  return groq
}

export function chaveConfigurada() {
  return provedor().chaveConfigurada()
}

export function modeloEmUso() {
  return provedor().modelo()
}

export function provedorEmUso() {
  const p = provedor()
  return {
    nome: p.NOME,
    rotulo: p.ROTULO,
    modelo: p.modelo(),
    lePdf: p.LE_PDF,
    leImagem: p.LE_IMAGEM,
    temCacheDePrompt: p.TEM_CACHE_DE_PROMPT,
    configurado: p.chaveConfigurada(),
  }
}

/** Tipos de arquivo que o provedor atual consegue ler sozinho. */
export function tiposLegiveisPelaIa() {
  const p = provedor()
  const tipos = {}
  if (p.LE_PDF) tipos['application/pdf'] = 'documento'
  if (p.LE_IMAGEM) {
    tipos['image/png'] = 'imagem'
    tipos['image/jpeg'] = 'imagem'
    tipos['image/gif'] = 'imagem'
    tipos['image/webp'] = 'imagem'
  }
  return tipos
}

export const TIPOS_TEXTO = ['text/plain', 'text/markdown', 'text/csv', 'application/json']

// ---------------------------------------------------------------------------
// Contexto institucional
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
 * Trecho do Estatuto a enviar.
 *
 * Com cache de prompt, vai integral: o modelo nunca precisa supor um artigo.
 * Sem cache, vão os artigos mais relevantes ao conteúdo, e o modelo é
 * instruído a dizer que falta base em vez de preencher a lacuna.
 */
function trechoDoEstatuto(assunto, limiteArtigos = 24) {
  const p = provedor()

  if (p.TEM_CACHE_DE_PROMPT) {
    return {
      texto: textoCompletoDoEstatuto(),
      integral: true,
      artigos: ARTIGOS.map((a) => a.rotulo),
    }
  }

  const relevantes = artigosRelevantes(assunto, limiteArtigos)
  const selecionados = relevantes.length > 0 ? relevantes : ARTIGOS.slice(0, limiteArtigos)
  return {
    texto: contextoDeArtigos(selecionados, 14_000),
    integral: false,
    artigos: selecionados.map((a) => a.rotulo),
  }
}

function cabecalhoEstatutario(trecho) {
  return `# Estatuto Oficial da Saint Paul Finance — versão vigente: ${VERSAO_ESTATUTO}

${
  trecho.integral
    ? 'Este é o texto integral do Estatuto.'
    : 'Estes são os artigos do Estatuto mais relevantes para o conteúdo em análise. ' +
      'Não é o Estatuto completo: se a base necessária não estiver aqui, diga que falta base em ' +
      'vez de supor.'
} É a única fonte de artigos, competências, quóruns e prazos que você pode citar.

${trecho.texto}

# Estrutura institucional do sistema

${estruturaInstitucional()}

${RUBRICA}`
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

/** Executa a chamada, normalizando o erro do provedor em ErroIA. */
async function chamar(argumentos) {
  try {
    return await provedor().chamar(argumentos)
  } catch (falha) {
    if (falha instanceof ErroIA) throw falha
    throw new ErroIA(
      falha?.message ||
        'Não foi possível concluir a chamada de IA. Tente novamente ou preencha os campos manualmente.',
      falha?.status || 502,
      falha?.codigo || 'erro_ia',
    )
  }
}

// ---------------------------------------------------------------------------
// Triagem de documentos
// ---------------------------------------------------------------------------

const LIMITE_CONTEUDO = 60_000

const INSTRUCAO_TRIAGEM = `Você apoia a Saint Paul Finance na triagem de documentos institucionais.

Sua função é SUGERIR um roteamento. A decisão é humana: uma pessoa autorizada revisa, edita e distribui. Nunca afirme que a distribuição foi feita.

Regras invioláveis:
1. Cite apenas artigos que constem do Estatuto fornecido acima. Se não houver base suficiente, deixe "artigosAplicaveis" vazio e explique isso em "justificativaDoRoteamento". Jamais invente artigo, capítulo, inciso, competência, quórum ou prazo.
2. Nunca indique a Diretoria Financeira como competente: ela é prevista apenas "quando instituída" e a Liga não a instituiu.
3. Em "diretoriaCompetente" e "coResponsavel" use o valor da esquerda da lista de diretorias. Em "quadroDestino" use o slug. Em "grupoDestino" use exatamente um dos grupos listados para aquele quadro.
4. Separe fato estatutário de interpretação. Ao interpretar, escreva "interpretação:" antes da afirmação.
5. Português do Brasil, tom institucional e sóbrio, sem emojis e sem linguagem promocional.
6. Responda EXCLUSIVAMENTE com um objeto JSON válido, sem texto antes ou depois, sem cercas de código e sem comentários.

Formato JSON exigido, com todos os campos preenchidos. String vazia quando não houver informação; null em "prazo" quando não houver data.

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
 * Aceita texto colado (`conteudo`) e, quando o provedor atual lê o formato,
 * um arquivo em `anexo`. Não grava nada: quem grava é a rota, e somente após
 * aprovação humana.
 */
export async function triarDocumento({ nome, conteudo = null, anexo = null }) {
  const p = provedor()
  let imagem = null
  let documentoPdf = null
  let truncado = false

  if (anexo) {
    const legiveis = tiposLegiveisPelaIa()
    const categoria = legiveis[anexo.tipo]

    if (!categoria) {
      const ehPdf = anexo.tipo === 'application/pdf'
      throw new ErroIA(
        ehPdf
          ? `O provedor de IA em uso (${p.ROTULO}, modelo ${p.modelo()}) não lê PDF. ` +
            'Abra o documento, copie o texto e use "Colar texto" para triar.'
          : `Tipo de arquivo que o provedor em uso não lê: ${anexo.tipo}. ` +
            `Formatos aceitos para leitura automática: ${Object.keys(legiveis).join(', ') || 'nenhum'}. ` +
            'Como alternativa, cole o texto do documento.',
        415,
        'tipo_nao_suportado',
      )
    }

    if (categoria === 'documento') documentoPdf = anexo
    else imagem = anexo
  }

  const recorte = conteudo ? String(conteudo).slice(0, LIMITE_CONTEUDO) : null
  if (conteudo) truncado = String(conteudo).length > LIMITE_CONTEUDO

  if (!recorte && !imagem && !documentoPdf) {
    throw new ErroIA('Nada a triar: envie um arquivo legível ou cole o texto.', 400, 'sem_conteudo')
  }

  const trecho = trechoDoEstatuto(`${nome} ${recorte || ''}`)

  const partes = [`Nome do arquivo: ${nome}`]
  if (truncado) partes.push(`Aviso: o texto foi truncado em ${LIMITE_CONTEUDO} caracteres.`)
  if (recorte) partes.push(`Conteúdo textual do documento:\n"""\n${recorte}\n"""`)
  partes.push('Classifique este documento e responda apenas com o JSON exigido.')

  const { texto, modelo, cache } = await chamar({
    sistema: `${cabecalhoEstatutario(trecho)}\n\n${INSTRUCAO_TRIAGEM}`,
    texto: partes.join('\n\n'),
    imagem,
    documentoPdf,
    maxTokens: 4096,
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

  const grupoValido = quadro && (quadro.grupos || []).some((g) => g.nome === sugestao.grupoDestino)

  const avisos = []
  if (artigosDescartados.length > 0) {
    avisos.push(
      `Referência(s) descartada(s) por não existir(em) no Estatuto vigente: ${artigosDescartados.join(', ')}.`,
    )
  }
  if (!trecho.integral) {
    avisos.push(
      `O provedor em uso (${p.ROTULO}) não tem cache de prompt, então foram enviados ` +
        `${trecho.artigos.length} artigos selecionados por relevância, e não o Estatuto inteiro. ` +
        'Confira a base estatutária antes de distribuir.',
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
1. Use exclusivamente o Estatuto fornecido acima. Nenhuma outra fonte, nenhum conhecimento externo, nenhuma analogia com outras entidades.
2. Cite os artigos que sustentam a resposta no formato "Art. 42º".
3. Separe explicitamente fato estatutário de interpretação: fatos em "fatosEstatutarios", leitura própria em "interpretacao".
4. Se o Estatuto fornecido não bastar, defina "baseSuficiente": false, explique o que falta e recomende encaminhar à Presidência como caso omisso (Art. 120º II).
5. Jamais invente artigo, parágrafo, inciso, competência, quórum ou prazo.
6. Português do Brasil, tom institucional e sóbrio.
7. Responda EXCLUSIVAMENTE com JSON válido, sem texto ao redor e sem cercas de código.

Formato JSON exigido:

{
  "resposta": "",
  "fatosEstatutarios": [],
  "interpretacao": "",
  "artigosCitados": [],
  "baseSuficiente": true,
  "observacao": ""
}`

export async function perguntarAoEstatuto(pergunta) {
  const trecho = trechoDoEstatuto(pergunta, 26)

  const { texto, modelo, cache } = await chamar({
    sistema: `${cabecalhoEstatutario(trecho)}\n\n${INSTRUCAO_ESTATUTO}`,
    texto: `Pergunta: ${pergunta}`,
    maxTokens: 3000,
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

  return {
    ...dados,
    artigosCitados: citados,
    artigosInexistentes: inexistentes,
    artigosConsultados: trecho.artigos,
    estatutoIntegral: trecho.integral,
    modelo,
    cache,
  }
}

export { ErroIA }
