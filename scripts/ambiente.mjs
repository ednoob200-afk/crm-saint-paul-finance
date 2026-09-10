/**
 * Carrega .env.local e .env para os scripts de linha de comando.
 * Next.js já faz isso sozinho em dev e build; scripts avulsos não.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function carregarAmbiente(raiz = process.cwd()) {
  for (const arquivo of ['.env.local', '.env']) {
    const caminho = resolve(raiz, arquivo)
    if (!existsSync(caminho)) continue
    const conteudo = readFileSync(caminho, 'utf8')
    for (const linha of conteudo.split('\n')) {
      const limpa = linha.trim()
      if (!limpa || limpa.startsWith('#')) continue
      const igual = limpa.indexOf('=')
      if (igual === -1) continue
      const chave = limpa.slice(0, igual).trim()
      let valor = limpa.slice(igual + 1).trim()
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1)
      }
      if (chave && process.env[chave] === undefined) process.env[chave] = valor
    }
  }
}
