/**
 * Cria o primeiro acesso administrativo e os grupos padrão dos quadros.
 *
 *   npm run seed
 *
 * Idempotente: rodar de novo não duplica usuário nem grupo, e não apaga nada.
 * Nenhum dado de exemplo é inserido — apenas a estrutura de grupos prevista no
 * Estatuto. Os quadros começam vazios, com estado vazio e formulário próprio.
 */
import pg from 'pg'
import { carregarAmbiente } from './ambiente.mjs'
import { QUADROS } from '../lib/quadros.js'
import { gerarHashSenha } from '../lib/senha.mjs'

carregarAmbiente()

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL não configurada. Rode `vercel env pull .env.local` primeiro.')
  process.exit(1)
}

const local = /(^|@|\/\/)(localhost|127\.0\.0\.1|\[::1\])/.test(url)
const ssl = local
  ? false
  : process.env.PGSSL_NO_VERIFY === '1'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: true }

const cliente = new pg.Client({ connectionString: url, ssl, application_name: 'spf-seed' })

async function semearGrupos() {
  let criados = 0
  for (const quadro of QUADROS) {
    let ordem = 0
    for (const grupo of quadro.grupos || []) {
      const { rowCount } = await cliente.query(
        `INSERT INTO grupos (quadro, nome, cor, artigo, ordem)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (quadro, nome) DO NOTHING`,
        [quadro.slug, grupo.nome, grupo.cor || 'cinza', grupo.artigo || null, ordem],
      )
      criados += rowCount
      ordem += 1
    }
  }
  return criados
}

async function semearAdministrador() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  if (!email) {
    console.log(
      '  · ADMIN_EMAIL não definida: nenhum usuário criado. Defina ADMIN_EMAIL e ' +
        'ADMIN_PASSWORD_HASH (gerado por `npm run hash-senha`) e rode de novo.',
    )
    return null
  }

  const { rows: existentes } = await cliente.query(
    'SELECT id, email FROM usuarios WHERE lower(email) = $1',
    [email],
  )
  if (existentes.length > 0) {
    console.log(`  · usuário ${email} já existe; nada alterado.`)
    return existentes[0]
  }

  let hash = (process.env.ADMIN_PASSWORD_HASH || '').trim()

  if (!hash) {
    const senha = process.env.ADMIN_PASSWORD
    if (!senha) {
      console.error(
        '\n  ! ADMIN_PASSWORD_HASH não definida. Gere o hash com `npm run hash-senha` e\n' +
          '    adicione-o ao ambiente. Nenhuma senha em texto puro é aceita em produção.',
      )
      return null
    }
    // Conveniência apenas para desenvolvimento local: converte em hash agora e
    // nunca grava a senha em texto puro.
    console.log('  ~ ADMIN_PASSWORD encontrada. Convertendo em hash; prefira ADMIN_PASSWORD_HASH.')
    hash = await gerarHashSenha(senha)
  }

  if (!hash.startsWith('scrypt$')) {
    console.error(
      '  ! ADMIN_PASSWORD_HASH não está no formato esperado. Gere-o com `npm run hash-senha`.',
    )
    return null
  }

  const nome = (process.env.ADMIN_NOME || '').trim() || 'Administrador do sistema'
  const { rows } = await cliente.query(
    `INSERT INTO usuarios (nome, email, senha_hash, papel)
     VALUES ($1, $2, $3, 'administrador')
     RETURNING id, email`,
    [nome, email, hash],
  )
  console.log(`  → usuário administrador criado: ${rows[0].email}`)
  return rows[0]
}

async function principal() {
  await cliente.connect()

  const { rows } = await cliente.query(
    `SELECT to_regclass('public.usuarios') IS NOT NULL AS pronto`,
  )
  if (!rows[0]?.pronto) {
    console.error('O banco ainda não foi migrado. Rode `npm run migrate` antes do seed.')
    process.exit(1)
  }

  console.log('Semeando estrutura institucional...')
  const grupos = await semearGrupos()
  console.log(
    grupos === 0
      ? '  · grupos já existiam; nenhum criado.'
      : `  → ${grupos} grupo(s) criado(s) em ${QUADROS.length} quadros.`,
  )

  console.log('Verificando acesso administrativo...')
  await semearAdministrador()

  console.log('\nPronto. Nenhum dado de exemplo foi inserido: os quadros começam vazios.')
}

principal()
  .then(() => cliente.end())
  .catch(async (erro) => {
    console.error('\nErro no seed:', erro.message)
    await cliente.end().catch(() => {})
    process.exit(1)
  })
