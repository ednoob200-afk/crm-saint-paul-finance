/**
 * Repositório de itens dos quadros. Todo SQL é parametrizado.
 *
 * A visibilidade por confidencialidade (Art. 96º e Art. 97º §1º) é aplicada
 * aqui, no servidor, e não na interface.
 */

import { linhas, primeira, consultar, transacao } from '@/lib/db'
import { CONFIDENCIALIDADE, confidencialidadeMaxima, obterQuadro } from '@/lib/quadros'
import { COLUNAS_BASE_ITEM } from '@/lib/validacao'

const CAMPOS_SELECT = `
  i.id, i.quadro, i.grupo_id, i.titulo, i.status, i.prioridade,
  i.responsavel, i.co_responsavel, i.diretoria, i.prazo, i.risco, i.blocker,
  i.proximo_passo, i.origem, i.confidencialidade, i.descricao, i.dados,
  i.artigos, i.checklist, i.documento_id, i.ordem,
  i.criado_por, i.criado_em, i.atualizado_em,
  g.nome AS grupo_nome, g.cor AS grupo_cor
`

/** Valores de confidencialidade que o papel pode ler. */
export function confidencialidadesVisiveis(papel) {
  const maximo = confidencialidadeMaxima(papel)
  return CONFIDENCIALIDADE.filter((c) => c.nivel <= maximo).map((c) => c.valor)
}

function formatarData(valor) {
  if (!valor) return null
  if (typeof valor === 'string') return valor.slice(0, 10)
  if (valor instanceof Date) {
    const ano = valor.getUTCFullYear()
    const mes = String(valor.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(valor.getUTCDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }
  return null
}

function normalizar(linha) {
  if (!linha) return null
  return {
    ...linha,
    prazo: formatarData(linha.prazo),
    dados: linha.dados || {},
    artigos: Array.isArray(linha.artigos) ? linha.artigos : [],
    checklist: Array.isArray(linha.checklist) ? linha.checklist : [],
  }
}

export async function listarItens(quadro, usuario, filtros = {}) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  const condicoes = ['i.quadro = $1', 'i.confidencialidade = ANY($2)']
  const valores = [quadro, visiveis]

  if (filtros.status) {
    valores.push(filtros.status)
    condicoes.push(`i.status = $${valores.length}`)
  }
  if (filtros.diretoria) {
    valores.push(filtros.diretoria)
    condicoes.push(`i.diretoria = $${valores.length}`)
  }
  if (filtros.responsavel) {
    valores.push(filtros.responsavel)
    condicoes.push(`i.responsavel = $${valores.length}`)
  }
  if (filtros.grupo_id) {
    valores.push(filtros.grupo_id)
    condicoes.push(`i.grupo_id = $${valores.length}`)
  }
  if (filtros.busca) {
    valores.push(`%${filtros.busca}%`)
    const p = `$${valores.length}`
    condicoes.push(`(
      i.titulo ILIKE ${p} OR
      coalesce(i.descricao, '') ILIKE ${p} OR
      coalesce(i.responsavel, '') ILIKE ${p} OR
      coalesce(i.proximo_passo, '') ILIKE ${p} OR
      coalesce(i.dados::text, '') ILIKE ${p}
    )`)
  }
  if (filtros.prazo === 'atrasado') {
    condicoes.push(`i.prazo < current_date`)
  } else if (filtros.prazo === 'proximo') {
    condicoes.push(`i.prazo >= current_date AND i.prazo <= current_date + interval '7 days'`)
  } else if (filtros.prazo === 'sem_prazo') {
    condicoes.push('i.prazo IS NULL')
  }

  const resultado = await linhas(
    `SELECT ${CAMPOS_SELECT}
       FROM itens i
       LEFT JOIN grupos g ON g.id = i.grupo_id
      WHERE ${condicoes.join(' AND ')}
      ORDER BY g.ordem NULLS LAST, i.ordem, i.criado_em
      LIMIT 2000`,
    valores,
  )
  return resultado.map(normalizar)
}

export async function obterItem(id, usuario) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  const linha = await primeira(
    `SELECT ${CAMPOS_SELECT}
       FROM itens i
       LEFT JOIN grupos g ON g.id = i.grupo_id
      WHERE i.id = $1 AND i.confidencialidade = ANY($2)`,
    [id, visiveis],
  )
  return normalizar(linha)
}

export async function historicoDoItem(id, limite = 200) {
  return linhas(
    `SELECT tipo, campo, valor_de, valor_para, usuario, criado_em
       FROM historico WHERE item_id = $1
      ORDER BY criado_em DESC LIMIT $2`,
    [id, Math.min(Number(limite) || 200, 500)],
  )
}

/** Tipos de evento que o histórico registra de forma nomeada (Seção 10). */
const TIPOS_HISTORICO = {
  status: 'alteracao_status',
  responsavel: 'mudanca_responsavel',
  co_responsavel: 'mudanca_responsavel',
  risco: 'risco',
  blocker: 'blocker',
  proximo_passo: 'proximo_passo',
  grupo_id: 'mudanca_grupo',
  prazo: 'alteracao_prazo',
  diretoria: 'mudanca_diretoria',
  confidencialidade: 'alteracao_confidencialidade',
}

function tipoDoEvento(campo, de, para) {
  if (campo === 'risco') return de && !para ? 'risco_resolvido' : 'risco_criado'
  if (campo === 'blocker') return de && !para ? 'blocker_resolvido' : 'blocker_criado'
  return TIPOS_HISTORICO[campo] || 'alteracao'
}

function comoTexto(valor) {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'object') return JSON.stringify(valor).slice(0, 1000)
  return String(valor).slice(0, 1000)
}

export async function criarItem(quadro, valores, usuario) {
  const config = obterQuadro(quadro)
  const colunas = ['quadro', 'criado_por']
  const parametros = [quadro, usuario.nome]

  const padroes = {
    confidencialidade: config?.confidencialidadePadrao || 'interno',
    status: config?.statusOpcoes?.[0]?.valor || null,
    prioridade: 'media',
  }

  for (const [campo, padrao] of Object.entries(padroes)) {
    if (valores[campo] === undefined || valores[campo] === null) valores[campo] = padrao
  }

  for (const campo of [...COLUNAS_BASE_ITEM, 'grupo_id', 'dados', 'artigos', 'checklist', 'documento_id']) {
    if (valores[campo] === undefined) continue
    colunas.push(campo)
    parametros.push(
      campo === 'dados' || campo === 'artigos' || campo === 'checklist'
        ? JSON.stringify(valores[campo] ?? (campo === 'dados' ? {} : []))
        : valores[campo],
    )
  }

  const placeholders = parametros.map((_, i) => `$${i + 1}`)

  return transacao(async (cliente) => {
    const { rows } = await cliente.query(
      `INSERT INTO itens (${colunas.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING id`,
      parametros,
    )
    const id = rows[0].id
    await cliente.query(
      `INSERT INTO historico (item_id, tipo, campo, valor_para, usuario)
       VALUES ($1, 'criacao', NULL, $2, $3)`,
      [id, comoTexto(valores.titulo), usuario.nome],
    )
    const { rows: completo } = await cliente.query(
      `SELECT ${CAMPOS_SELECT} FROM itens i LEFT JOIN grupos g ON g.id = i.grupo_id WHERE i.id = $1`,
      [id],
    )
    return normalizar(completo[0])
  })
}

export async function atualizarItem(id, alteracoes, usuario) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)

  return transacao(async (cliente) => {
    const { rows: atuais } = await cliente.query(
      `SELECT * FROM itens WHERE id = $1 AND confidencialidade = ANY($2) FOR UPDATE`,
      [id, visiveis],
    )
    if (atuais.length === 0) return null
    const atual = atuais[0]

    const campos = []
    const parametros = []
    const eventos = []

    for (const [campo, novo] of Object.entries(alteracoes)) {
      const permitido = [
        ...COLUNAS_BASE_ITEM,
        'grupo_id',
        'dados',
        'artigos',
        'checklist',
        'ordem',
      ].includes(campo)
      if (!permitido) continue

      const anterior =
        campo === 'prazo' ? formatarData(atual[campo]) : atual[campo]
      const jsonb = campo === 'dados' || campo === 'artigos' || campo === 'checklist'
      const novoComparavel = jsonb ? JSON.stringify(novo) : novo
      const anteriorComparavel = jsonb ? JSON.stringify(anterior) : anterior

      if (String(novoComparavel ?? '') === String(anteriorComparavel ?? '')) continue

      parametros.push(jsonb ? JSON.stringify(novo) : novo)
      campos.push(`${campo} = $${parametros.length}`)

      if (campo !== 'ordem' && campo !== 'dados' && campo !== 'checklist' && campo !== 'artigos') {
        eventos.push({
          tipo: tipoDoEvento(campo, anterior, novo),
          campo,
          de: comoTexto(anterior),
          para: comoTexto(novo),
        })
      } else if (campo === 'checklist') {
        eventos.push({ tipo: 'checklist', campo, de: null, para: `${(novo || []).length} item(ns)` })
      }
    }

    if (campos.length === 0) {
      const { rows } = await cliente.query(
        `SELECT ${CAMPOS_SELECT} FROM itens i LEFT JOIN grupos g ON g.id = i.grupo_id WHERE i.id = $1`,
        [id],
      )
      return normalizar(rows[0])
    }

    parametros.push(id)
    await cliente.query(
      `UPDATE itens SET ${campos.join(', ')}, atualizado_em = now()
        WHERE id = $${parametros.length}`,
      parametros,
    )

    for (const evento of eventos) {
      await cliente.query(
        `INSERT INTO historico (item_id, tipo, campo, valor_de, valor_para, usuario)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, evento.tipo, evento.campo, evento.de, evento.para, usuario.nome],
      )
    }

    const { rows } = await cliente.query(
      `SELECT ${CAMPOS_SELECT} FROM itens i LEFT JOIN grupos g ON g.id = i.grupo_id WHERE i.id = $1`,
      [id],
    )
    return normalizar(rows[0])
  })
}

export async function excluirItem(id, usuario) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  const { rowCount } = await consultar(
    'DELETE FROM itens WHERE id = $1 AND confidencialidade = ANY($2)',
    [id, visiveis],
  )
  return rowCount > 0
}

/** Contagem por grupo, usada nos cabeçalhos recolhíveis da tabela. */
export async function contarPorGrupo(quadro, usuario) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  return linhas(
    `SELECT grupo_id, count(*)::int AS total
       FROM itens WHERE quadro = $1 AND confidencialidade = ANY($2)
      GROUP BY grupo_id`,
    [quadro, visiveis],
  )
}
