/**
 * Leitura de listas de e-mail coladas pela diretoria.
 *
 * Módulo puro, sem banco: aceita um bloco de texto com e-mails separados por
 * linha, vírgula ou ponto e vírgula, e devolve os válidos, os inválidos e as
 * repetições removidas.
 */

export const REGEX_EMAIL = /^[^\s@,;]+@[^\s@.,;]+(\.[^\s@.,;]+)+$/
export const LIMITE_TAMANHO = 200

export function separarEmails(bruto) {
  const partes = String(bruto ?? '')
    .split(/[\n,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)

  const validos = []
  const invalidos = []
  const repetidos = []
  const vistos = new Set()

  for (const parte of partes) {
    if (!REGEX_EMAIL.test(parte) || parte.length > LIMITE_TAMANHO) {
      invalidos.push(parte.slice(0, 80))
      continue
    }
    if (vistos.has(parte)) {
      repetidos.push(parte)
      continue
    }
    vistos.add(parte)
    validos.push(parte)
  }

  return { validos, invalidos, repetidos }
}
