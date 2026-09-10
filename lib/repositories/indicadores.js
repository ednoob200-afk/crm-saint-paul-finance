/**
 * Indicadores da Visão executiva. Todos vêm de dados reais.
 *
 * Fundamento: Art. 39º II e IV (guardião do sistema de gestão, com
 * acompanhamento de objetivos, owners, deadlines, riscos e blockers) e
 * Art. 63º §2º (a reunião prioriza desvios, riscos, blockers e próximos passos).
 */

import { linhas, primeira } from '@/lib/db'
import { QUADROS } from '@/lib/quadros'
import { confidencialidadesVisiveis } from '@/lib/repositories/itens'

const STATUS_FINALIZADOS = [
  'concluido',
  'cancelado',
  'executada',
  'rejeitada',
  'publicado',
  'arquivado',
  'encerrada',
  'encerrada_',
  'desligado',
  'nao_aprovado',
  'desistiu',
  'declinada',
  'nao_participaremos',
  'alumni',
  'inativo',
]

export async function carregarIndicadores(usuario) {
  const visiveis = confidencialidadesVisiveis(usuario.papel)
  const quadrosOperacionais = QUADROS.map((q) => q.slug)

  const [resumo, porDiretoria, porQuadro, riscos, blockers, proximos, deliberacoes, atrasados] =
    await Promise.all([
      primeira(
        `SELECT
           count(*) FILTER (WHERE NOT (status = ANY($2)))::int AS abertos,
           count(*) FILTER (WHERE prazo < current_date AND NOT (status = ANY($2)))::int AS atrasados,
           count(*) FILTER (WHERE blocker IS NOT NULL AND blocker <> '')::int AS blockers,
           count(*) FILTER (WHERE risco IS NOT NULL AND risco <> '')::int AS riscos,
           count(*) FILTER (WHERE quadro = 'crm')::int AS contatos_crm,
           count(*) FILTER (WHERE quadro = 'parcerias' AND status IN ('ativa', 'aprovada'))::int AS parcerias_ativas,
           count(*)::int AS total
         FROM itens WHERE confidencialidade = ANY($1)`,
        [visiveis, STATUS_FINALIZADOS],
      ),
      linhas(
        `SELECT diretoria,
                count(*)::int AS total,
                count(*) FILTER (WHERE NOT (status = ANY($2)))::int AS abertos,
                count(*) FILTER (WHERE prazo < current_date AND NOT (status = ANY($2)))::int AS atrasados
           FROM itens
          WHERE confidencialidade = ANY($1) AND diretoria IS NOT NULL
          GROUP BY diretoria ORDER BY abertos DESC`,
        [visiveis, STATUS_FINALIZADOS],
      ),
      linhas(
        `SELECT quadro,
                count(*)::int AS total,
                count(*) FILTER (WHERE NOT (status = ANY($3)))::int AS abertos
           FROM itens
          WHERE confidencialidade = ANY($1) AND quadro = ANY($2)
          GROUP BY quadro`,
        [visiveis, quadrosOperacionais, STATUS_FINALIZADOS],
      ),
      linhas(
        `SELECT id, quadro, titulo, risco, responsavel, diretoria, prioridade, prazo
           FROM itens
          WHERE confidencialidade = ANY($1)
            AND risco IS NOT NULL AND risco <> ''
            AND prioridade IN ('alta', 'critica')
          ORDER BY CASE prioridade WHEN 'critica' THEN 0 ELSE 1 END, prazo NULLS LAST
          LIMIT 12`,
        [visiveis],
      ),
      linhas(
        `SELECT id, quadro, titulo, blocker, responsavel, diretoria, prazo
           FROM itens
          WHERE confidencialidade = ANY($1) AND blocker IS NOT NULL AND blocker <> ''
          ORDER BY prazo NULLS LAST LIMIT 12`,
        [visiveis],
      ),
      linhas(
        `SELECT id, quadro, titulo, prazo, responsavel, diretoria, status, prioridade
           FROM itens
          WHERE confidencialidade = ANY($1)
            AND prazo IS NOT NULL
            AND prazo <= current_date + interval '21 days'
            AND NOT (status = ANY($2))
          ORDER BY prazo LIMIT 30`,
        [visiveis, STATUS_FINALIZADOS],
      ),
      linhas(
        `SELECT id, titulo, status, responsavel, prazo,
                dados->>'instancia' AS instancia,
                dados->>'quorum' AS quorum
           FROM itens
          WHERE quadro = 'deliberacoes' AND confidencialidade = ANY($1)
            AND status IN ('em_pauta', 'em_deliberacao', 'aprovada', 'em_execucao')
          ORDER BY CASE status
                     WHEN 'em_pauta' THEN 0
                     WHEN 'em_deliberacao' THEN 1
                     WHEN 'aprovada' THEN 2
                     ELSE 3 END,
                   prazo NULLS LAST
          LIMIT 20`,
        [visiveis],
      ),
      linhas(
        `SELECT id, quadro, titulo, prazo, responsavel, diretoria, status
           FROM itens
          WHERE confidencialidade = ANY($1)
            AND prazo < current_date
            AND NOT (status = ANY($2))
          ORDER BY prazo LIMIT 20`,
        [visiveis, STATUS_FINALIZADOS],
      ),
    ])

  return {
    resumo: resumo || {
      abertos: 0,
      atrasados: 0,
      blockers: 0,
      riscos: 0,
      contatos_crm: 0,
      parcerias_ativas: 0,
      total: 0,
    },
    porDiretoria,
    porQuadro,
    riscos,
    blockers,
    proximos: proximos.map((p) => ({ ...p, prazo: p.prazo ? String(p.prazo).slice(0, 10) : null })),
    atrasados: atrasados.map((p) => ({ ...p, prazo: p.prazo ? String(p.prazo).slice(0, 10) : null })),
    deliberacoes: deliberacoes.map((d) => ({
      ...d,
      prazo: d.prazo ? String(d.prazo).slice(0, 10) : null,
    })),
  }
}
