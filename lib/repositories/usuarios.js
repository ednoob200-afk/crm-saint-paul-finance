/** Repositório de usuários. Senhas trafegam apenas como hash. */

import { linhas, primeira, consultar, transacao } from '@/lib/db'
import { gerarHashSenha } from '@/lib/senha.mjs'

export async function listarUsuarios() {
  return linhas(
    `SELECT id, nome, email, papel, diretoria, ativo, criado_em
       FROM usuarios ORDER BY ativo DESC, nome`,
  )
}

export async function buscarPorEmail(email) {
  return primeira(
    `SELECT id, nome, email, senha_hash, papel, diretoria, ativo
       FROM usuarios WHERE lower(email) = lower($1)`,
    [email],
  )
}

export async function contarUsuarios() {
  const linha = await primeira('SELECT count(*)::int AS total FROM usuarios')
  return linha ? linha.total : 0
}

/**
 * Cria o usuário já com senha definida pela Presidência.
 *
 * Também registra a pessoa na lista de acesso como já ativada: a lista é a
 * autoridade sobre quem pode entrar, e um usuário fora dela não conseguiria
 * fazer login.
 */
export async function criarUsuario({ nome, email, senha, papel, diretoria = null, criadoPor = null }) {
  const hash = await gerarHashSenha(senha)

  return transacao(async (cliente) => {
    const { rows } = await cliente.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel, diretoria)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, email, papel, diretoria, ativo, criado_em`,
      [nome, email, hash, papel, diretoria],
    )
    const usuario = rows[0]

    // Atualiza a entrada existente ou cria uma nova. Escrito em dois passos,
    // e não com ON CONFLICT, porque o índice de unicidade é sobre a expressão
    // lower(email) e a forma explícita não depende de como o servidor
    // interpreta um alvo de conflito por expressão.
    const { rowCount } = await cliente.query(
      `UPDATE lista_acesso
          SET ativo = true,
              nome = COALESCE(nome, $2),
              papel = $3,
              diretoria = $4,
              ativado_em = COALESCE(ativado_em, now()),
              ativado_por = COALESCE(ativado_por, 'criado pela Presidência'),
              usuario_id = $5,
              convite_token_hash = NULL,
              convite_expira_em = NULL,
              atualizado_em = now()
        WHERE lower(email) = lower($1)`,
      [usuario.email, nome, papel, diretoria, usuario.id],
    )

    if (rowCount === 0) {
      await cliente.query(
        `INSERT INTO lista_acesso
           (email, nome, papel, diretoria, ativo, ativado_em, ativado_por, usuario_id, criado_por,
            primeiro_acesso_livre)
         VALUES ($1, $2, $3, $4, true, now(), 'criado pela Presidência', $5, $6, false)`,
        [usuario.email, nome, papel, diretoria, usuario.id, criadoPor],
      )
    }

    return usuario
  })
}

export async function atualizarUsuario(id, alteracoes) {
  const campos = []
  const parametros = []

  for (const campo of ['nome', 'email', 'papel', 'diretoria', 'ativo']) {
    if (alteracoes[campo] === undefined) continue
    parametros.push(alteracoes[campo])
    campos.push(`${campo} = $${parametros.length}`)
  }
  if (alteracoes.senha) {
    parametros.push(await gerarHashSenha(alteracoes.senha))
    campos.push(`senha_hash = $${parametros.length}`)
  }
  if (campos.length === 0) return null

  parametros.push(id)
  const { rows } = await consultar(
    `UPDATE usuarios SET ${campos.join(', ')}, atualizado_em = now()
      WHERE id = $${parametros.length}
      RETURNING id, nome, email, papel, diretoria, ativo, criado_em`,
    parametros,
  )
  const usuario = rows[0] || null
  if (!usuario) return null

  // Mantém a lista de acesso coerente: ela é a autoridade sobre quem entra, e
  // divergir daqui deixaria alguém ativo em um lugar e revogado no outro.
  await consultar(
    `UPDATE lista_acesso
        SET papel = $2,
            diretoria = $3,
            ativo = $4,
            convite_token_hash = CASE WHEN $4 THEN convite_token_hash ELSE NULL END,
            atualizado_em = now()
      WHERE usuario_id = $1 OR lower(email) = lower($5)`,
    [usuario.id, usuario.papel, usuario.diretoria, usuario.ativo, usuario.email],
  ).catch((erro) => {
    console.error('[usuarios] falha ao sincronizar a lista de acesso:', erro.message)
  })

  return usuario
}

/** Revoga todas as sessões de um usuário. Usado ao desativar ou trocar papel. */
export async function revogarSessoes(usuarioId) {
  const { rowCount } = await consultar('DELETE FROM sessoes WHERE usuario_id = $1', [usuarioId])
  return rowCount
}

/** Nomes usados para preencher os seletores de responsável. */
export async function nomesDisponiveis() {
  const usuarios = await linhas('SELECT nome FROM usuarios WHERE ativo ORDER BY nome')
  const membros = await linhas(
    `SELECT DISTINCT titulo AS nome FROM itens
      WHERE quadro = 'membros' AND status IN ('ativo', 'em_formacao') ORDER BY titulo`,
  )
  const conjunto = new Set([...usuarios, ...membros].map((r) => r.nome).filter(Boolean))
  return [...conjunto].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
