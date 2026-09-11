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

/**
 * Autoriza o primeiro administrador na lista de acesso.
 *
 * Por padrão nenhuma senha é criada aqui: a pessoa vai à tela de acesso,
 * escolhe "Primeiro acesso" e define a própria senha. Assim nenhuma senha
 * passa por arquivo, por variável de ambiente ou por mensagem.
 *
 * Se ADMIN_PASSWORD_HASH estiver definida, o usuário é criado já com senha —
 * caminho de exceção, mantido para ambientes automatizados.
 */
async function semearAdministrador() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  if (!email) {
    console.log(
      '  · ADMIN_EMAIL não definida: nenhum acesso autorizado. Rode de novo com\n' +
        '    ADMIN_EMAIL=voce@saintpaul.edu.br npm run seed',
    )
    return null
  }

  const nome = (process.env.ADMIN_NOME || '').trim() || null
  const hash = (process.env.ADMIN_PASSWORD_HASH || '').trim()

  const { rows: jaUsuario } = await cliente.query(
    'SELECT id FROM usuarios WHERE lower(email) = $1',
    [email],
  )

  // Garante a autorização na lista, que é quem decide se o login passa.
  const { rowCount: atualizados } = await cliente.query(
    `UPDATE lista_acesso
        SET ativo = true,
            papel = 'administrador',
            nome = COALESCE(nome, $2),
            primeiro_acesso_livre = CASE WHEN ativado_em IS NULL THEN true ELSE primeiro_acesso_livre END,
            atualizado_em = now()
      WHERE lower(email) = lower($1)`,
    [email, nome],
  )

  if (atualizados === 0) {
    await cliente.query(
      `INSERT INTO lista_acesso
         (email, nome, papel, ativo, criado_por, primeiro_acesso_livre)
       VALUES ($1, $2, 'administrador', true, 'seed', true)`,
      [email, nome],
    )
    console.log(`  → ${email} autorizado como administrador do sistema.`)
  } else {
    console.log(`  · ${email} já constava na lista de acesso; autorização confirmada.`)
  }

  if (jaUsuario.length > 0) {
    console.log('  · a senha já foi criada anteriormente; nada alterado.')
    return jaUsuario[0]
  }

  if (!hash) {
    const url = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    console.log(
      '\n  Próximo passo, feito por você mesmo:\n' +
        `    1. abra ${url ? `${url}/entrar` : 'a tela de acesso do sistema'}\n` +
        '    2. escolha "Primeiro acesso"\n' +
        `    3. informe ${email} e crie a sua senha\n`,
    )
    return null
  }

  // Caminho de exceção: senha definida fora, por hash.
  if (!hash.startsWith('scrypt$')) {
    console.error(
      '  ! ADMIN_PASSWORD_HASH não está no formato esperado. Gere-o com `npm run hash-senha`,\n' +
        '    ou remova a variável para usar o primeiro acesso pela tela.',
    )
    return null
  }

  const { rows } = await cliente.query(
    `INSERT INTO usuarios (nome, email, senha_hash, papel)
     VALUES ($1, $2, $3, 'administrador')
     RETURNING id, email`,
    [nome || 'Administrador do sistema', email, hash],
  )
  const usuario = rows[0]

  await cliente.query(
    `UPDATE lista_acesso
        SET usuario_id = $2,
            ativado_em = COALESCE(ativado_em, now()),
            ativado_por = COALESCE(ativado_por, 'seed'),
            primeiro_acesso_livre = false,
            atualizado_em = now()
      WHERE lower(email) = lower($1)`,
    [email, usuario.id],
  )

  console.log(`  → usuário administrador criado com a senha fornecida: ${usuario.email}`)
  return usuario
}

async function principal() {
  await cliente.connect()

  const { rows } = await cliente.query(
    `SELECT to_regclass('public.usuarios') IS NOT NULL AS usuarios,
            to_regclass('public.lista_acesso') IS NOT NULL AS lista`,
  )
  if (!rows[0]?.usuarios || !rows[0]?.lista) {
    console.error('O banco ainda não foi migrado por completo. Rode `npm run migrate` antes do seed.')
    process.exit(1)
  }

  console.log('Semeando estrutura institucional...')
  const grupos = await semearGrupos()
  console.log(
    grupos === 0
      ? '  · grupos já existiam; nenhum criado.'
      : `  → ${grupos} grupo(s) criado(s) em ${QUADROS.length} quadros.`,
  )

  console.log('Autorizando o acesso administrativo...')
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
