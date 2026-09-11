/**
 * Gera um único arquivo SQL com todas as migrações e a semeadura inicial,
 * para ser colado no editor SQL do provedor (Neon, Supabase) quando não houver
 * terminal à mão.
 *
 *   node scripts/gerar-sql-completo.mjs [email-do-administrador]
 *
 * O resultado é equivalente a `npm run migrate` seguido de `npm run seed`:
 * cria o esquema, registra as migrações em _migracoes com o mesmo hash que o
 * migrate calcularia, semeia os grupos previstos no Estatuto e autoriza o
 * primeiro administrador na lista de acesso.
 *
 * Nenhuma senha é criada: o administrador define a própria em /entrar.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { QUADROS } from '../lib/quadros.js'

const email = (process.argv[2] || '').trim().toLowerCase()
const diretorio = resolve(process.cwd(), 'db/migracoes')
const saida = resolve(process.cwd(), 'db/instalacao-completa.sql')

/** Escapa um literal de texto para SQL. Nenhum valor vem de entrada não confiável. */
function literal(valor) {
  if (valor === null || valor === undefined) return 'NULL'
  return `'${String(valor).replace(/'/g, "''")}'`
}

const partes = [
  '-- ===========================================================================',
  '-- Saint Paul Finance — instalação completa do banco',
  '--',
  '-- Gerado por scripts/gerar-sql-completo.mjs. Não edite à mão.',
  '-- Cole tudo no editor SQL do provedor e execute uma única vez.',
  '--',
  '-- É idempotente: executar de novo não apaga dados nem duplica registros.',
  '-- Equivale a `npm run migrate` seguido de `npm run seed`.',
  '-- ===========================================================================',
  '',
  'BEGIN;',
  '',
  '-- Controle de migrações, igual ao criado por scripts/migrate.mjs ------------',
  'CREATE TABLE IF NOT EXISTS _migracoes (',
  '  nome        text PRIMARY KEY,',
  '  hash        text NOT NULL,',
  '  aplicada_em timestamptz NOT NULL DEFAULT now()',
  ');',
  '',
]

const arquivos = readdirSync(diretorio)
  .filter((n) => n.endsWith('.sql'))
  .sort()

for (const nome of arquivos) {
  const sql = readFileSync(resolve(diretorio, nome), 'utf8')
  const hash = createHash('sha256').update(sql).digest('hex').slice(0, 16)

  partes.push(
    '-- ---------------------------------------------------------------------------',
    `-- Migração ${nome}`,
    '-- ---------------------------------------------------------------------------',
    sql.trim(),
    '',
    `INSERT INTO _migracoes (nome, hash) VALUES (${literal(nome)}, ${literal(hash)})`,
    '  ON CONFLICT (nome) DO NOTHING;',
    '',
  )
}

// ---------------------------------------------------------------- semeadura --
partes.push(
  '-- ---------------------------------------------------------------------------',
  '-- Grupos previstos no Estatuto, por quadro',
  '-- ---------------------------------------------------------------------------',
)

for (const quadro of QUADROS) {
  let ordem = 0
  for (const grupo of quadro.grupos || []) {
    partes.push(
      'INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES (' +
        [
          literal(quadro.slug),
          literal(grupo.nome),
          literal(grupo.cor || 'cinza'),
          literal(grupo.artigo || null),
          ordem,
        ].join(', ') +
        ') ON CONFLICT (quadro, nome) DO NOTHING;',
    )
    ordem += 1
  }
}

partes.push('')

if (email) {
  partes.push(
    '-- ---------------------------------------------------------------------------',
    '-- Primeiro administrador, autorizado na lista de acesso.',
    '-- Nenhuma senha é criada aqui: a pessoa define a própria em /entrar,',
    '-- escolhendo "Primeiro acesso".',
    '-- ---------------------------------------------------------------------------',
    'INSERT INTO lista_acesso (email, papel, ativo, criado_por, primeiro_acesso_livre)',
    `VALUES (${literal(email)}, 'administrador', true, 'instalação', true)`,
    'ON CONFLICT DO NOTHING;',
    '',
    'UPDATE lista_acesso',
    "   SET ativo = true, papel = 'administrador', atualizado_em = now()",
    ` WHERE lower(email) = ${literal(email)};`,
    '',
    '-- Se uma execução anterior deste instalador autorizou outro e-mail que',
    '-- nunca foi usado, a autorização é removida: acesso administrativo solto',
    '-- é risco, e o Art. 97º §1º restringe o acesso a quem tem necessidade',
    '-- funcional. Entradas já ativadas ou criadas por pessoas não são tocadas.',
    'DELETE FROM lista_acesso',
    " WHERE criado_por = 'instalação'",
    '   AND ativado_em IS NULL',
    '   AND usuario_id IS NULL',
    `   AND lower(email) <> ${literal(email)};`,
    '',
  )
}

partes.push(
  'COMMIT;',
  '',
  '-- Verificação rápida do resultado -------------------------------------------',
  "SELECT 'migrações aplicadas' AS item, count(*)::text AS valor FROM _migracoes",
  'UNION ALL',
  "SELECT 'grupos criados', count(*)::text FROM grupos",
  'UNION ALL',
  "SELECT 'pessoas autorizadas', count(*)::text FROM lista_acesso",
  'UNION ALL',
  "SELECT 'itens', count(*)::text FROM itens;",
  '',
)

writeFileSync(saida, partes.join('\n'))

console.log(`Gerado: ${saida}`)
console.log(`  migrações: ${arquivos.length} (${arquivos.join(', ')})`)
console.log(`  grupos: ${QUADROS.reduce((t, q) => t + (q.grupos?.length || 0), 0)}`)
console.log(email ? `  administrador autorizado: ${email}` : '  sem administrador (passe o e-mail como argumento)')
