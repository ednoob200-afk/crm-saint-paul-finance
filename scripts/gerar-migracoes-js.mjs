/**
 * Empacota db/migracoes/*.sql em lib/migracoes.js.
 *
 *   node scripts/gerar-migracoes-js.mjs
 *
 * Uma função serverless não lê arquivos arbitrários do repositório de forma
 * confiável: o empacotador só inclui o que consegue rastrear no código. Com o
 * SQL em um módulo JavaScript, a rota de instalação funciona na Vercel sem
 * depender do sistema de arquivos.
 *
 * O arquivo gerado é versionado. Um teste confere que ele continua igual aos
 * .sql de origem, para que uma migração nova nunca fique de fora por
 * esquecimento.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const diretorio = resolve(process.cwd(), 'db/migracoes')
const saida = resolve(process.cwd(), 'lib/migracoes.js')

export function lerMigracoes() {
  return readdirSync(diretorio)
    .filter((n) => n.endsWith('.sql'))
    .sort()
    .map((nome) => {
      const sql = readFileSync(resolve(diretorio, nome), 'utf8')
      return {
        nome,
        sql,
        hash: createHash('sha256').update(sql).digest('hex').slice(0, 16),
      }
    })
}

function gerar() {
  const migracoes = lerMigracoes()

  const corpo = migracoes
    .map(
      (m) =>
        `  {\n` +
        `    nome: ${JSON.stringify(m.nome)},\n` +
        `    hash: ${JSON.stringify(m.hash)},\n` +
        `    sql: ${JSON.stringify(m.sql)},\n` +
        `  },`,
    )
    .join('\n')

  const conteudo = `/**
 * Migrações empacotadas. ARQUIVO GERADO — não edite à mão.
 *
 * Origem: db/migracoes/*.sql
 * Regenere com: node scripts/gerar-migracoes-js.mjs
 *
 * O hash é o mesmo que scripts/migrate.mjs calcula, de modo que aplicar por
 * aqui ou pela linha de comando produz o mesmo registro em _migracoes.
 */

export const MIGRACOES = [
${corpo}
]

export default MIGRACOES
`

  writeFileSync(saida, conteudo)
  return migracoes
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const migracoes = gerar()
  console.log(`Gerado: ${saida}`)
  for (const m of migracoes) console.log(`  ${m.nome}  ${m.hash}`)
}
