/**
 * Lista de acesso: quem está autorizado a usar o sistema, com que papel e em
 * que diretoria.
 *
 * O convite é um token de uso único. O banco guarda apenas o **hash** do
 * token, então o link só pode ser exibido no momento em que é gerado — se for
 * perdido, gera-se outro. Isso evita que uma leitura da tabela permita entrar
 * no lugar de alguém.
 *
 * Fundamento: Art. 97º §1º e Art. 38º.
 */

import { createHash, randomBytes } from 'node:crypto'
import { linhas, primeira, consultar, transacao } from '@/lib/db'
import { gerarHashSenha } from '@/lib/senha.mjs'

const DIAS_DE_VALIDADE = 14

const CAMPOS = `
  id, email, nome, papel, diretoria, observacao, ativo,
  primeiro_acesso_livre, convite_expira_em, ativado_em, ativado_por,
  usuario_id, criado_por, criado_em,
  (convite_token_hash IS NOT NULL) AS convite_pendente
`

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function gerarToken() {
  return randomBytes(32).toString('base64url')
}

export function listar() {
  return linhas(
    `SELECT ${CAMPOS} FROM lista_acesso
      ORDER BY ativo DESC, ativado_em IS NULL DESC, lower(email)`,
  )
}

export function obterPorId(id) {
  return primeira(`SELECT ${CAMPOS} FROM lista_acesso WHERE id = $1`, [id])
}

/**
 * A pessoa está autorizada a entrar? Usado no login, depois da verificação da
 * senha: um registro em `usuarios` sozinho não basta.
 */
export async function autorizada(email) {
  const linha = await primeira(
    'SELECT ativo FROM lista_acesso WHERE lower(email) = lower($1)',
    [email],
  )
  return Boolean(linha?.ativo)
}

/**
 * Adiciona vários e-mails de uma vez.
 *
 * Nenhum token é criado aqui: o caminho normal é o primeiro acesso direto, em
 * que a pessoa vai à tela de acesso e cria a própria senha. O link de convite
 * é gerado sob demanda, quando a Presidência preferir esse controle.
 */
export async function adicionarVarios(
  emails,
  { papel, diretoria, observacao, criadoPor, primeiroAcessoLivre = true },
) {
  const criados = []
  const jaExistiam = []

  for (const email of emails) {
    const { rows } = await consultar(
      `INSERT INTO lista_acesso
         (email, papel, diretoria, observacao, criado_por, primeiro_acesso_livre)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING ${CAMPOS}`,
      [email, papel, diretoria || null, observacao || null, criadoPor, primeiroAcessoLivre],
    )

    if (rows.length === 0) {
      jaExistiam.push(email)
      continue
    }
    criados.push(rows[0])
  }

  return { criados, jaExistiam }
}

/** Gera um convite novo, invalidando o anterior. */
export async function regerarConvite(id) {
  const token = gerarToken()
  const expiraEm = new Date(Date.now() + DIAS_DE_VALIDADE * 86_400_000)

  const { rows } = await consultar(
    `UPDATE lista_acesso
        SET convite_token_hash = $2,
            convite_expira_em = $3,
            atualizado_em = now()
      WHERE id = $1 AND ativo
      RETURNING ${CAMPOS}`,
    [id, hashToken(token), expiraEm],
  )
  if (rows.length === 0) return null
  return { ...rows[0], token }
}

export async function atualizar(
  id,
  { papel, diretoria, observacao, nome, primeiro_acesso_livre: primeiroAcessoLivre },
) {
  const campos = []
  const parametros = []

  for (const [campo, valor] of Object.entries({
    papel,
    diretoria,
    observacao,
    nome,
    primeiro_acesso_livre: primeiroAcessoLivre,
  })) {
    if (valor === undefined) continue
    parametros.push(valor)
    campos.push(`${campo} = $${parametros.length}`)
  }
  if (campos.length === 0) return obterPorId(id)

  parametros.push(id)
  const { rows } = await consultar(
    `UPDATE lista_acesso SET ${campos.join(', ')}, atualizado_em = now()
      WHERE id = $${parametros.length} RETURNING ${CAMPOS}`,
    parametros,
  )
  const entrada = rows[0] || null

  // O papel na lista é a autoridade: propaga para o usuário já ativado.
  if (entrada?.usuario_id && papel !== undefined) {
    await consultar('UPDATE usuarios SET papel = $2, atualizado_em = now() WHERE id = $1', [
      entrada.usuario_id,
      papel,
    ])
    await consultar('DELETE FROM sessoes WHERE usuario_id = $1', [entrada.usuario_id])
  }
  if (entrada?.usuario_id && diretoria !== undefined) {
    await consultar('UPDATE usuarios SET diretoria = $2, atualizado_em = now() WHERE id = $1', [
      entrada.usuario_id,
      diretoria || null,
    ])
  }

  return entrada
}

/**
 * Revogar desliga o acesso de verdade: apaga o convite pendente, desativa o
 * usuário correspondente e encerra as sessões abertas.
 */
export async function definirAtivo(id, ativo) {
  return transacao(async (cliente) => {
    const { rows } = await cliente.query(
      `UPDATE lista_acesso
          SET ativo = $2,
              convite_token_hash = CASE WHEN $2 THEN convite_token_hash ELSE NULL END,
              convite_expira_em = CASE WHEN $2 THEN convite_expira_em ELSE NULL END,
              atualizado_em = now()
        WHERE id = $1
        RETURNING ${CAMPOS}`,
      [id, ativo],
    )
    if (rows.length === 0) return null
    const entrada = rows[0]

    if (entrada.usuario_id) {
      await cliente.query('UPDATE usuarios SET ativo = $2, atualizado_em = now() WHERE id = $1', [
        entrada.usuario_id,
        ativo,
      ])
      if (!ativo) {
        await cliente.query('DELETE FROM sessoes WHERE usuario_id = $1', [entrada.usuario_id])
      }
    }

    return entrada
  })
}

export async function remover(id) {
  const { rowCount } = await consultar(
    'DELETE FROM lista_acesso WHERE id = $1 AND ativado_em IS NULL',
    [id],
  )
  return rowCount > 0
}

/** Convite válido para este token, ou null. Nunca revela o motivo exato. */
export async function obterPorToken(token) {
  if (typeof token !== 'string' || token.length < 20) return null
  return primeira(
    `SELECT id, email, nome, papel, diretoria, ativo, convite_expira_em, ativado_em
       FROM lista_acesso
      WHERE convite_token_hash = $1
        AND ativo
        AND ativado_em IS NULL
        AND convite_expira_em > now()`,
    [hashToken(token)],
  )
}

/**
 * Ativa o convite: cria o usuário com a senha escolhida pela própria pessoa e
 * consome o token. Em transação, para não deixar convite consumido sem usuário.
 */
export async function ativarConvite(token, { nome, senha }) {
  const convite = await obterPorToken(token)
  if (!convite) return { ok: false, motivo: 'convite_invalido' }

  const senhaHash = await gerarHashSenha(senha)

  return transacao(async (cliente) => {
    // Reconfere dentro da transação e trava a linha, para que dois envios
    // simultâneos não criem dois usuários.
    const { rows: atuais } = await cliente.query(
      `SELECT id, email, papel, diretoria FROM lista_acesso
        WHERE id = $1 AND convite_token_hash = $2 AND ativo AND ativado_em IS NULL
          AND convite_expira_em > now()
        FOR UPDATE`,
      [convite.id, hashToken(token)],
    )
    if (atuais.length === 0) return { ok: false, motivo: 'convite_invalido' }
    const entrada = atuais[0]

    const { rows: existentes } = await cliente.query(
      'SELECT id FROM usuarios WHERE lower(email) = lower($1)',
      [entrada.email],
    )
    if (existentes.length > 0) {
      return { ok: false, motivo: 'usuario_existente' }
    }

    const { rows: criados } = await cliente.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel, diretoria)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, email, papel, diretoria`,
      [nome, entrada.email, senhaHash, entrada.papel, entrada.diretoria],
    )
    const usuario = criados[0]

    await cliente.query(
      `UPDATE lista_acesso
          SET convite_token_hash = NULL,
              convite_expira_em = NULL,
              ativado_em = now(),
              ativado_por = 'link de convite',
              usuario_id = $2,
              nome = COALESCE(nome, $3),
              atualizado_em = now()
        WHERE id = $1`,
      [entrada.id, usuario.id, nome],
    )

    return { ok: true, usuario }
  })
}

/**
 * Entrada apta a primeiro acesso direto, ou null.
 *
 * Direto significa: quem está na lista vai à tela de acesso, informa o e-mail
 * autorizado e cria a própria senha, sem link e sem senha distribuída por
 * ninguém. A Presidência pode exigir link em uma entrada específica quando o
 * caso for sensível.
 */
export async function aptaAPrimeiroAcesso(email) {
  return primeira(
    `SELECT id, email, nome, papel, diretoria
       FROM lista_acesso
      WHERE lower(email) = lower($1)
        AND ativo
        AND primeiro_acesso_livre
        AND ativado_em IS NULL`,
    [email],
  )
}

/**
 * Primeiro acesso direto: cria o usuário com a senha escolhida pela própria
 * pessoa. Em transação e com a linha travada, para que dois envios simultâneos
 * não criem dois usuários para o mesmo e-mail.
 */
export async function ativarPrimeiroAcesso(email, { nome, senha, ip = null }) {
  const apta = await aptaAPrimeiroAcesso(email)
  if (!apta) return { ok: false, motivo: 'nao_autorizado' }

  const senhaHash = await gerarHashSenha(senha)

  return transacao(async (cliente) => {
    const { rows: atuais } = await cliente.query(
      `SELECT id, email, papel, diretoria FROM lista_acesso
        WHERE id = $1 AND ativo AND primeiro_acesso_livre AND ativado_em IS NULL
        FOR UPDATE`,
      [apta.id],
    )
    if (atuais.length === 0) return { ok: false, motivo: 'nao_autorizado' }
    const entrada = atuais[0]

    const { rows: existentes } = await cliente.query(
      'SELECT id FROM usuarios WHERE lower(email) = lower($1)',
      [entrada.email],
    )
    if (existentes.length > 0) return { ok: false, motivo: 'usuario_existente' }

    const { rows: criados } = await cliente.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel, diretoria)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, email, papel, diretoria`,
      [nome, entrada.email, senhaHash, entrada.papel, entrada.diretoria],
    )
    const usuario = criados[0]

    await cliente.query(
      `UPDATE lista_acesso
          SET convite_token_hash = NULL,
              convite_expira_em = NULL,
              ativado_em = now(),
              ativado_por = $4,
              usuario_id = $2,
              nome = COALESCE(nome, $3),
              atualizado_em = now()
        WHERE id = $1`,
      [entrada.id, usuario.id, nome, ip ? `primeiro acesso direto (${ip})` : 'primeiro acesso direto'],
    )

    return { ok: true, usuario }
  })
}

export async function contarPendentes() {
  const linha = await primeira(
    'SELECT count(*)::int AS total FROM lista_acesso WHERE ativo AND ativado_em IS NULL',
  )
  return linha ? linha.total : 0
}

export { DIAS_DE_VALIDADE }
