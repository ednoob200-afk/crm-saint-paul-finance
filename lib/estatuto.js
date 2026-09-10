/**
 * Acesso ao Estatuto Oficial como referência estruturada.
 *
 * O artigo nunca é guardado apenas como texto solto: cada item, decisão e
 * sugestão de roteamento aponta para um rótulo canônico ("Art. 42º") que este
 * módulo resolve em capítulo, caput e parágrafos.
 *
 * Fonte: data/estatuto.json, gerado do Estatuto de setembro de 2026.
 */

import estatuto from '@/data/estatuto.json'

export const VERSAO_ESTATUTO = estatuto.versao
export const CAPITULOS = estatuto.capitulos
export const ARTIGOS = estatuto.artigos
export const PREAMBULO = estatuto.preambulo

const PARA_ROMANO = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25, XXVI: 26,
}

export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
}

const PALAVRAS_IGNORADAS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'ou', 'em', 'no',
  'na', 'nos', 'nas', 'um', 'uma', 'que', 'qual', 'quais', 'para', 'por',
  'com', 'sem', 'ao', 'aos', 'quem', 'como', 'quando', 'onde', 'sobre', 'se',
  'ser', 'e', 'pode', 'posso', 'deve', 'the', 'of',
])

/**
 * Extrai o número do artigo de rótulos como "Art. 42º", "art 42", "artigo 42 II".
 * Retorna null quando não há número reconhecível — nunca inventa um artigo.
 */
export function numeroDoRotulo(rotulo) {
  const m = String(rotulo || '').match(/(\d{1,3})/)
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 121 ? n : null
}

export function obterArtigo(referencia) {
  const numero = typeof referencia === 'number' ? referencia : numeroDoRotulo(referencia)
  if (numero === null) return null
  return ARTIGOS.find((a) => a.numero === numero) || null
}

/** Um rótulo de artigo existe no Estatuto vigente? */
export function artigoExiste(rotulo) {
  return obterArtigo(rotulo) !== null
}

export function capituloDoArtigo(referencia) {
  const artigo = obterArtigo(referencia)
  if (!artigo || !artigo.capitulo) return null
  return CAPITULOS.find((c) => c.numero === artigo.capitulo) || null
}

/** Rótulo canônico e legível: "Art. 42º". */
export function rotuloCanonico(referencia) {
  const artigo = obterArtigo(referencia)
  return artigo ? artigo.rotulo : null
}

/**
 * Busca por texto livre, ordenada por número de termos encontrados.
 * Aceita também "42", "art 42", "capítulo XI".
 */
export function buscarArtigos(consulta, limite = 25) {
  const bruto = String(consulta || '').trim()
  if (bruto === '') return ARTIGOS.slice(0, limite)

  const alvo = normalizar(bruto)

  // Consulta direta por número de artigo.
  const numeroDireto = alvo.match(/^(?:art\.?|artigo)?\s*(\d{1,3})[ºo°]?$/)
  if (numeroDireto) {
    const artigo = obterArtigo(Number(numeroDireto[1]))
    if (artigo) return [artigo]
  }

  // Consulta por capítulo.
  const capitulo = alvo.match(/^cap(?:itulo)?\.?\s*([ivxlc]+)$/)
  if (capitulo) {
    const romano = capitulo[1].toUpperCase()
    if (PARA_ROMANO[romano]) {
      return ARTIGOS.filter((a) => a.capitulo === romano).slice(0, 200)
    }
  }

  const termos = alvo
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !PALAVRAS_IGNORADAS.has(t))

  if (termos.length === 0) return []

  const pontuados = ARTIGOS.map((artigo) => {
    let pontos = 0
    for (const termo of termos) {
      if (artigo.busca.includes(termo)) pontos += 1
      if (normalizar(artigo.capituloTitulo || '').includes(termo)) pontos += 0.5
    }
    return { artigo, pontos }
  })
    .filter((p) => p.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.artigo.numero - b.artigo.numero)

  return pontuados.slice(0, limite).map((p) => p.artigo)
}

/**
 * Artigos mais prováveis para um conteúdo qualquer. Usado para montar o
 * contexto enviado ao modelo, de modo que ele cite apenas o Estatuto real.
 */
export function artigosRelevantes(texto, limite = 18) {
  const alvo = normalizar(texto).slice(0, 8000)
  const termos = [
    ...new Set(
      alvo
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3 && !PALAVRAS_IGNORADAS.has(t)),
    ),
  ].slice(0, 120)

  if (termos.length === 0) return ARTIGOS.slice(0, limite)

  const pontuados = ARTIGOS.map((artigo) => {
    let pontos = 0
    for (const termo of termos) if (artigo.busca.includes(termo)) pontos += 1
    return { artigo, pontos }
  })
    .filter((p) => p.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)

  return pontuados.slice(0, limite).map((p) => p.artigo)
}

/** Texto compacto de artigos, para enviar ao modelo dentro do limite de tokens. */
export function contextoDeArtigos(artigos, limiteCaracteres = 24000) {
  const partes = []
  let total = 0
  for (const a of artigos) {
    const bloco = `${a.rotulo} (Capítulo ${a.capitulo} — ${a.capituloTitulo}): ${a.texto}`
    if (total + bloco.length > limiteCaracteres) break
    partes.push(bloco)
    total += bloco.length
  }
  return partes.join('\n\n')
}

/**
 * Estatuto inteiro em texto, capítulo por capítulo.
 *
 * É enviado ao modelo como prefixo estável e cacheado, para que ele nunca
 * precise "supor" um artigo que não recebeu. São cerca de 65 mil caracteres,
 * dentro da janela de contexto com folga.
 */
export function textoCompletoDoEstatuto() {
  const partes = [`${VERSAO_ESTATUTO} — Estatuto Oficial da Saint Paul Finance`]
  for (const capitulo of CAPITULOS) {
    partes.push(`\n\nCAPÍTULO ${capitulo.numero} — ${capitulo.titulo}`)
    for (const artigo of ARTIGOS.filter((a) => a.capitulo === capitulo.numero)) {
      partes.push(`\n${artigo.rotulo}. ${artigo.texto}`)
    }
  }
  return partes.join('')
}

export function artigosPorCapitulo() {
  return CAPITULOS.map((capitulo) => ({
    ...capitulo,
    artigos: ARTIGOS.filter((a) => a.capitulo === capitulo.numero),
  }))
}
