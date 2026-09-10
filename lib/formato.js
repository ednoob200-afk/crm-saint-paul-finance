/**
 * Formatação compartilhada entre servidor e navegador.
 * Módulo puro: não importa banco, sessão nem storage.
 */

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** Data no formato AAAA-MM-DD interpretada sem fuso, para não deslocar o dia. */
export function partesDaData(iso) {
  if (typeof iso !== 'string') return null
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) }
}

export function hojeIso() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

export function formatarData(iso) {
  const p = partesDaData(iso)
  if (!p) return '—'
  return `${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}/${p.ano}`
}

export function formatarDataHora(valor) {
  if (!valor) return '—'
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const hora = String(d.getHours()).padStart(2, '0')
  const minuto = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${d.getFullYear()} ${hora}:${minuto}`
}

export function nomeDoMes(ano, mes) {
  return `${MESES[mes - 1] || ''} de ${ano}`
}

/** Diferença em dias entre a data e hoje. Negativo significa vencida. */
export function diasAte(iso) {
  const p = partesDaData(iso)
  if (!p) return null
  const alvo = Date.UTC(p.ano, p.mes - 1, p.dia)
  const h = partesDaData(hojeIso())
  const base = Date.UTC(h.ano, h.mes - 1, h.dia)
  return Math.round((alvo - base) / 86_400_000)
}

/** 'vencida' | 'proxima' | 'normal' | null — usada para colorir o prazo. */
export function situacaoDoPrazo(iso) {
  const dias = diasAte(iso)
  if (dias === null) return null
  if (dias < 0) return 'vencida'
  if (dias <= 7) return 'proxima'
  return 'normal'
}

/** Iniciais para o avatar: até duas letras. */
export function iniciais(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (partes.length === 0) return ''
  if (partes.length === 1) return partes[0].slice(0, 2)
  return `${partes[0][0]}${partes[partes.length - 1][0]}`
}

/** Lê "dados.organizacao" ou "titulo" de um item, sem lançar em nulos. */
export function lerCampo(item, caminho) {
  if (!item || !caminho) return null
  if (!caminho.startsWith('dados.')) {
    const valor = item[caminho]
    return valor === undefined ? null : valor
  }
  const chave = caminho.slice('dados.'.length)
  const dados = item.dados || {}
  const valor = dados[chave]
  return valor === undefined ? null : valor
}

/** Monta o corpo de um PATCH a partir de "dados.x" ou de uma coluna base. */
export function montarAlteracao(caminho, valor) {
  if (caminho.startsWith('dados.')) {
    return { dados: { [caminho.slice('dados.'.length)]: valor } }
  }
  return { [caminho]: valor }
}

export function truncar(texto, limite = 120) {
  const s = String(texto ?? '')
  return s.length > limite ? `${s.slice(0, limite - 1)}…` : s
}

const ROTULOS_HISTORICO = {
  criacao: 'Item criado',
  alteracao_status: 'Status alterado',
  mudanca_responsavel: 'Responsável alterado',
  mudanca_grupo: 'Grupo alterado',
  mudanca_diretoria: 'Diretoria alterada',
  alteracao_prazo: 'Prazo alterado',
  alteracao_confidencialidade: 'Confidencialidade alterada',
  risco_criado: 'Risco registrado',
  risco_resolvido: 'Risco resolvido',
  blocker_criado: 'Blocker registrado',
  blocker_resolvido: 'Blocker resolvido',
  proximo_passo: 'Próximo passo definido',
  checklist: 'Checklist atualizado',
  alteracao: 'Campo alterado',
}

export function rotuloHistorico(tipo) {
  return ROTULOS_HISTORICO[tipo] || 'Alteração'
}
