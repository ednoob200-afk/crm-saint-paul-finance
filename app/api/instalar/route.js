/**
 * Instalação do banco a partir de dentro da própria implantação.
 *
 * Existe porque a integração do Neon na Vercel cria as variáveis como
 * Sensitive: o valor não pode ser lido de fora, nem pelo `vercel env pull`,
 * então `npm run migrate` não roda de outra máquina. Aqui a DATABASE_URL já
 * está no ambiente da função.
 *
 * Proteções:
 * - só responde se INSTALACAO_TOKEN estiver definida no ambiente;
 * - exige o token no cabeçalho, comparado em tempo constante;
 * - é idempotente: migração já aplicada não roda de novo, e a semeadura não
 *   duplica nem apaga;
 * - nunca cria senha: o administrador é apenas autorizado na lista de acesso
 *   e define a própria senha em /entrar;
 * - registra o resultado na trilha de auditoria.
 *
 * Depois de instalar, remova INSTALACAO_TOKEN do projeto: sem ela a rota
 * passa a responder 404.
 */

import { createHash, timingSafeEqual } from 'node:crypto'
import { bancoConfigurado, consultar, linhas, transacao } from '@/lib/db'
import { MIGRACOES } from '@/lib/migracoes'
import { QUADROS } from '@/lib/quadros'
import { erro, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const REGEX_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

function tokenConfere(recebido) {
  const esperado = process.env.INSTALACAO_TOKEN || ''
  if (!esperado || typeof recebido !== 'string' || recebido.length === 0) return false
  // Compara hashes para que o tamanho do token não influencie a comparação.
  const a = createHash('sha256').update(recebido).digest()
  const b = createHash('sha256').update(esperado).digest()
  return timingSafeEqual(a, b)
}

async function aplicarMigracoes() {
  await consultar(`
    CREATE TABLE IF NOT EXISTS _migracoes (
      nome        text PRIMARY KEY,
      hash        text NOT NULL,
      aplicada_em timestamptz NOT NULL DEFAULT now()
    )
  `)

  const aplicadas = new Map(
    (await linhas('SELECT nome, hash FROM _migracoes')).map((r) => [r.nome, r.hash]),
  )

  const novas = []
  const jaAplicadas = []
  const divergentes = []

  for (const migracao of MIGRACOES) {
    if (aplicadas.has(migracao.nome)) {
      if (aplicadas.get(migracao.nome) !== migracao.hash) divergentes.push(migracao.nome)
      else jaAplicadas.push(migracao.nome)
      continue
    }

    await transacao(async (cliente) => {
      await cliente.query(migracao.sql)
      await cliente.query('INSERT INTO _migracoes (nome, hash) VALUES ($1, $2)', [
        migracao.nome,
        migracao.hash,
      ])
    })
    novas.push(migracao.nome)
  }

  return { novas, jaAplicadas, divergentes }
}

async function semearGrupos() {
  let criados = 0
  for (const quadro of QUADROS) {
    let ordem = 0
    for (const grupo of quadro.grupos || []) {
      const { rowCount } = await consultar(
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

async function autorizarAdministrador(email) {
  const { rowCount } = await consultar(
    `UPDATE lista_acesso
        SET ativo = true,
            papel = 'administrador',
            primeiro_acesso_livre = CASE WHEN ativado_em IS NULL THEN true ELSE primeiro_acesso_livre END,
            atualizado_em = now()
      WHERE lower(email) = lower($1)`,
    [email],
  )

  if (rowCount === 0) {
    await consultar(
      `INSERT INTO lista_acesso (email, papel, ativo, criado_por, primeiro_acesso_livre)
       VALUES ($1, 'administrador', true, 'instalação', true)`,
      [email],
    )
    return 'autorizado'
  }
  return 'ja_constava'
}

/**
 * Remove autorização que a própria instalação criou para outro e-mail e que
 * nunca foi usada. Acesso administrativo pendente e sem dono é risco, e o
 * Art. 97º §1º restringe o acesso a quem tem necessidade funcional legítima.
 */
async function limparAutorizacoesSoltas(emailAtual) {
  const { rowCount } = await consultar(
    `DELETE FROM lista_acesso
      WHERE criado_por = 'instalação'
        AND ativado_em IS NULL
        AND usuario_id IS NULL
        AND lower(email) <> lower($1)`,
    [emailAtual],
  )
  return rowCount
}

export async function POST(request) {
  try {
    // Sem token configurado, a rota não existe para o mundo.
    if (!process.env.INSTALACAO_TOKEN) {
      return new Response('Not Found', { status: 404 })
    }

    if (!tokenConfere(request.headers.get('x-instalacao-token'))) {
      return erro('Token de instalação inválido.', 403)
    }

    if (!bancoConfigurado()) {
      return erro('DATABASE_URL não está configurada nesta implantação.', 503)
    }

    const corpo = await request.json().catch(() => ({}))
    const email = String(corpo?.email || process.env.ADMIN_EMAIL || '')
      .trim()
      .toLowerCase()

    if (email && !REGEX_EMAIL.test(email)) {
      return erro('E-mail do administrador inválido.', 422)
    }

    const migracoes = await aplicarMigracoes()
    const gruposCriados = await semearGrupos()

    let administrador = null
    let autorizacoesRemovidas = 0
    if (email) {
      administrador = { email, situacao: await autorizarAdministrador(email) }
      autorizacoesRemovidas = await limparAutorizacoesSoltas(email)
    }

    const [contagens] = await linhas(`
      SELECT (SELECT count(*) FROM _migracoes)::int  AS migracoes,
             (SELECT count(*) FROM grupos)::int      AS grupos,
             (SELECT count(*) FROM lista_acesso)::int AS autorizados,
             (SELECT count(*) FROM usuarios)::int    AS usuarios,
             (SELECT count(*) FROM itens)::int       AS itens
    `)

    await consultar(
      `INSERT INTO auditoria (usuario, papel, acao, recurso, detalhe)
       VALUES ($1, 'administrador', 'instalacao', 'banco', $2)`,
      [
        email || 'instalação',
        `migrações novas: ${migracoes.novas.join(', ') || 'nenhuma'}; ` +
          `grupos criados: ${gruposCriados}; autorizações removidas: ${autorizacoesRemovidas}`,
      ],
    ).catch(() => {})

    return ok({
      migracoes,
      gruposCriados,
      administrador,
      autorizacoesRemovidas,
      contagens,
      proximoPasso: email
        ? `Abra /entrar, escolha "Primeiro acesso" e crie a senha de ${email}.`
        : 'Nenhum administrador informado: envie { "email": "..." } no corpo.',
      lembrete:
        'Remova a variável INSTALACAO_TOKEN do projeto na Vercel. Sem ela esta rota responde 404.',
    })
  } catch (e) {
    return tratarErro(e, 'instalar')
  }
}
