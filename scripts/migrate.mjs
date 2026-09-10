/**
 * Aplica as migrações pendentes de db/migracoes na ordem do nome do arquivo.
 *
 * As migrações são idempotentes e aditivas: reaplicar não apaga dados. Cada
 * arquivo aplicado é registrado em _migracoes e nunca roda duas vezes.
 *
 *   npm run migrate
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import pg from 'pg'
import { carregarAmbiente } from './ambiente.mjs'

carregarAmbiente()

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL

if (!url) {
  console.error(
    '\nDATABASE_URL não configurada.\n\n' +
      'Defina DATABASE_URL (e, se o provedor tiver conexão direta separada,\n' +
      'DIRECT_DATABASE_URL) em .env.local ou traga do projeto com:\n\n' +
      '  vercel env pull .env.local\n',
  )
  process.exit(1)
}

const local = /(^|@|\/\/)(localhost|127\.0\.0\.1|\[::1\])/.test(url)
const ssl = local
  ? false
  : process.env.PGSSL_NO_VERIFY === '1'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: true }

const cliente = new pg.Client({ connectionString: url, ssl, application_name: 'spf-migrate' })

const diretorio = resolve(process.cwd(), 'db/migracoes')

async function principal() {
  await cliente.connect()

  await cliente.query(`
    CREATE TABLE IF NOT EXISTS _migracoes (
      nome       text PRIMARY KEY,
      hash       text NOT NULL,
      aplicada_em timestamptz NOT NULL DEFAULT now()
    )
  `)

  const { rows } = await cliente.query('SELECT nome, hash FROM _migracoes')
  const aplicadas = new Map(rows.map((r) => [r.nome, r.hash]))

  const arquivos = readdirSync(diretorio)
    .filter((n) => n.endsWith('.sql'))
    .sort()

  let novas = 0

  for (const nome of arquivos) {
    const sql = readFileSync(resolve(diretorio, nome), 'utf8')
    const hash = createHash('sha256').update(sql).digest('hex').slice(0, 16)

    if (aplicadas.has(nome)) {
      if (aplicadas.get(nome) !== hash) {
        console.warn(
          `  ~ ${nome} já aplicada, mas o arquivo mudou depois disso. ` +
            'Crie uma nova migração em vez de editar uma já aplicada.',
        )
      } else {
        console.log(`  · ${nome} já aplicada`)
      }
      continue
    }

    process.stdout.write(`  → aplicando ${nome} ... `)
    try {
      await cliente.query('BEGIN')
      await cliente.query(sql)
      await cliente.query('INSERT INTO _migracoes (nome, hash) VALUES ($1, $2)', [nome, hash])
      await cliente.query('COMMIT')
      console.log('ok')
      novas += 1
    } catch (erro) {
      await cliente.query('ROLLBACK')
      console.log('falhou')
      throw erro
    }
  }

  console.log(
    novas === 0
      ? '\nBanco já estava atualizado. Nenhuma alteração aplicada.'
      : `\n${novas} migração(ões) aplicada(s). Nenhum dado existente foi apagado.`,
  )
}

principal()
  .then(() => cliente.end())
  .catch(async (erro) => {
    console.error('\nErro ao migrar:', erro.message)
    await cliente.end().catch(() => {})
    process.exit(1)
  })
