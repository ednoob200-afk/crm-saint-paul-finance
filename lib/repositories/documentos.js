/**
 * Repositório de documentos e do fluxo de triagem por IA.
 *
 * Nenhum documento vira item de quadro sem aprovação humana explícita
 * (Art. 100º e Art. 110º: responsabilidade final é humana).
 */

import { linhas, primeira, consultar } from '@/lib/db'
import { confidencialidadesVisiveis } from '@/lib/repositories/itens'

const CAMPOS = `
  id, nome, tipo_arquivo, tamanho, url, status, sugestao_ia, sugestao_editada,
  erro_ia, modelo_ia, confidencialidade, criado_por, criado_em, triado_em,
  aprovado_por, aprovado_em, item_id,
  length(coalesce(conteudo_texto, '')) AS tamanho_texto
`

export async function listarDocumentos(usuario, limite = 100) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  return linhas(
    `SELECT ${CAMPOS} FROM documentos
      WHERE confidencialidade = ANY($1)
      ORDER BY criado_em DESC LIMIT $2`,
    [visiveis, Math.min(Number(limite) || 100, 300)],
  )
}

export async function obterDocumento(id, usuario, { comTexto = false } = {}) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  return primeira(
    `SELECT ${CAMPOS}${comTexto ? ', conteudo_texto' : ''}
       FROM documentos WHERE id = $1 AND confidencialidade = ANY($2)`,
    [id, visiveis],
  )
}

export async function criarDocumento({
  nome,
  conteudoTexto,
  tipoArquivo = 'texto/plain',
  tamanho = null,
  url = null,
  criadoPor,
  confidencialidade = 'interno',
}) {
  const { rows } = await consultar(
    `INSERT INTO documentos (nome, tipo_arquivo, tamanho, url, conteudo_texto, criado_por, confidencialidade)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${CAMPOS}`,
    [nome, tipoArquivo, tamanho, url, conteudoTexto, criadoPor, confidencialidade],
  )
  return rows[0]
}

export async function registrarSugestao(id, { sugestao, modelo, erro = null }) {
  const { rows } = await consultar(
    `UPDATE documentos
        SET sugestao_ia = $2,
            modelo_ia = $3,
            erro_ia = $4,
            status = CASE WHEN $4 IS NULL THEN 'triado' ELSE 'erro_triagem' END,
            triado_em = now()
      WHERE id = $1
      RETURNING ${CAMPOS}`,
    [id, sugestao ? JSON.stringify(sugestao) : null, modelo, erro],
  )
  return rows[0] || null
}

export async function registrarAprovacao(id, { itemId, sugestaoEditada, aprovadoPor }) {
  const { rows } = await consultar(
    `UPDATE documentos
        SET status = 'distribuido',
            item_id = $2,
            sugestao_editada = $3,
            aprovado_por = $4,
            aprovado_em = now()
      WHERE id = $1
      RETURNING ${CAMPOS}`,
    [id, itemId, JSON.stringify(sugestaoEditada), aprovadoPor],
  )
  return rows[0] || null
}

export async function descartarDocumento(id, usuario) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  const { rowCount } = await consultar(
    `UPDATE documentos SET status = 'descartado'
      WHERE id = $1 AND status <> 'distribuido' AND confidencialidade = ANY($2)`,
    [id, visiveis],
  )
  return rowCount > 0
}

export async function contarAguardandoRevisao(usuario) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  const linha = await primeira(
    `SELECT count(*)::int AS total FROM documentos
      WHERE status IN ('recebido', 'triado') AND confidencialidade = ANY($1)`,
    [visiveis],
  )
  return linha ? linha.total : 0
}
