/**
 * Única porta de acesso ao PostgreSQL.
 *
 * Nenhum componente visual importa este módulo. As rotas de API e os
 * repositórios em lib/repositories/ são os únicos consumidores. Trocar de
 * provedor (Neon, Supabase, Vercel Postgres) exige alterar apenas a
 * DATABASE_URL e, se necessário, a política de TLS abaixo.
 */

import { Pool } from 'pg'

const global_ = globalThis

class ErroDeConfiguracao extends Error {
  constructor(mensagem) {
    super(mensagem)
    this.name = 'ErroDeConfiguracao'
    this.codigo = 'banco_nao_configurado'
  }
}

export function bancoConfigurado() {
  return Boolean(process.env.DATABASE_URL)
}

function politicaTls(connectionString) {
  const local = /(^|@|\/\/)(localhost|127\.0\.0\.1|\[::1\])/.test(connectionString)
  if (local || /sslmode=disable/.test(connectionString)) return false
  // Alguns provedores usam CA própria em conexão direta. Nesse caso, e apenas
  // nele, defina PGSSL_NO_VERIFY=1 no ambiente.
  if (process.env.PGSSL_NO_VERIFY === '1') return { rejectUnauthorized: false }
  return { rejectUnauthorized: true }
}

function criarPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: politicaTls(connectionString),
    // Funções serverless são efêmeras e concorrentes: poucas conexões por
    // instância e reciclagem rápida evitam esgotar o limite do provedor.
    max: Number(process.env.PG_POOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Nenhuma query de leitura ou escrita deste sistema deve passar de 15s.
    statement_timeout: 15_000,
    query_timeout: 15_000,
    application_name: 'crm-saint-paul-finance',
  })
}

/**
 * Pool reaproveitado entre invocações da mesma instância e entre recompilações
 * do next dev.
 */
export function pool() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new ErroDeConfiguracao(
      'A variável DATABASE_URL não está configurada. Configure o PostgreSQL de produção antes de usar o sistema.',
    )
  }
  if (!global_.__spfPool || global_.__spfPoolUrl !== url) {
    if (global_.__spfPool) global_.__spfPool.end().catch(() => {})
    global_.__spfPool = criarPool(url)
    global_.__spfPoolUrl = url
    global_.__spfPool.on('error', (erro) => {
      // Um cliente idle derrubado pelo provedor não deve encerrar o processo.
      console.error('[db] cliente inativo com erro:', erro.message)
    })
  }
  return global_.__spfPool
}

/** Executa SQL sempre parametrizado. Nunca interpole valores no texto. */
export async function consultar(texto, valores = []) {
  const resultado = await pool().query(texto, valores)
  return resultado
}

export async function linhas(texto, valores = []) {
  const { rows } = await consultar(texto, valores)
  return rows
}

export async function primeira(texto, valores = []) {
  const { rows } = await consultar(texto, valores)
  return rows.length > 0 ? rows[0] : null
}

/** Transação com rollback garantido. */
export async function transacao(callback) {
  const cliente = await pool().connect()
  try {
    await cliente.query('BEGIN')
    const resultado = await callback(cliente)
    await cliente.query('COMMIT')
    return resultado
  } catch (erro) {
    try {
      await cliente.query('ROLLBACK')
    } catch {
      // conexão já perdida; o provedor descarta a transação
    }
    throw erro
  } finally {
    cliente.release()
  }
}

export { ErroDeConfiguracao }
