/** Repositório de usuários. Senhas trafegam apenas como hash. */

import { linhas, primeira, consultar } from '@/lib/db'
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

export async function criarUsuario({ nome, email, senha, papel, diretoria = null }) {
  const hash = await gerarHashSenha(senha)
  const { rows } = await consultar(
    `INSERT INTO usuarios (nome, email, senha_hash, papel, diretoria)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, email, papel, diretoria, ativo, criado_em`,
    [nome, email, hash, papel, diretoria],
  )
  return rows[0]
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
  return rows[0] || null
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
