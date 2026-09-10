/** Repositório de grupos dos quadros. */

import { linhas, primeira, consultar } from '@/lib/db'
import { QUADROS } from '@/lib/quadros'

export async function listarGrupos(quadro) {
  return linhas(
    `SELECT id, quadro, nome, cor, artigo, ordem
       FROM grupos WHERE quadro = $1 ORDER BY ordem, nome`,
    [quadro],
  )
}

export async function obterGrupo(id) {
  return primeira('SELECT id, quadro, nome, cor, artigo, ordem FROM grupos WHERE id = $1', [id])
}

export async function criarGrupo(quadro, { nome, cor = 'cinza', artigo = null }) {
  const { rows } = await consultar(
    `INSERT INTO grupos (quadro, nome, cor, artigo, ordem)
     VALUES ($1, $2, $3, $4, COALESCE((SELECT max(ordem) + 1 FROM grupos WHERE quadro = $1), 0))
     ON CONFLICT (quadro, nome) DO UPDATE SET cor = EXCLUDED.cor
     RETURNING id, quadro, nome, cor, artigo, ordem`,
    [quadro, nome, cor, artigo],
  )
  return rows[0]
}

/**
 * Garante que os grupos declarados no Estatuto existam para o quadro.
 * Aditivo: nunca remove grupo criado pela diretoria nem apaga itens.
 */
export async function garantirGruposPadrao(slug) {
  const quadro = QUADROS.find((q) => q.slug === slug)
  if (!quadro) return []
  const existentes = await listarGrupos(slug)
  if (existentes.length > 0) return existentes

  let ordem = 0
  for (const grupo of quadro.grupos || []) {
    await consultar(
      `INSERT INTO grupos (quadro, nome, cor, artigo, ordem)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (quadro, nome) DO NOTHING`,
      [slug, grupo.nome, grupo.cor || 'cinza', grupo.artigo || null, ordem],
    )
    ordem += 1
  }
  return listarGrupos(slug)
}
