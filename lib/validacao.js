/**
 * Validação de entrada no servidor, com Zod. A validação do navegador é
 * conveniência; esta é a que vale.
 */

import { z } from 'zod'
import {
  CONFIDENCIALIDADE,
  DIRETORIAS,
  PRIORIDADES,
  camposDoQuadro,
  obterQuadro,
} from '@/lib/quadros'

/** Colunas com tipo próprio na tabela itens. Tudo mais vai para `dados`. */
export const COLUNAS_BASE_ITEM = [
  'titulo',
  'status',
  'prioridade',
  'responsavel',
  'co_responsavel',
  'diretoria',
  'prazo',
  'risco',
  'blocker',
  'proximo_passo',
  'origem',
  'confidencialidade',
  'descricao',
]

const texto = (max = 300) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()

const textoLongo = texto(20000)

const REGEX_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

const emailValido = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .regex(REGEX_EMAIL, 'Informe um e-mail válido.')

const data = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Data inválida.')
  .nullable()
  .or(z.literal('').transform(() => null))
  .or(z.null())

const valoresDiretoria = DIRETORIAS.map((d) => d.valor)
const valoresConfidencialidade = CONFIDENCIALIDADE.map((c) => c.valor)
const valoresPrioridade = PRIORIDADES.map((p) => p.valor)

/**
 * Sanitização de texto vindo do usuário. O React já escapa ao renderizar;
 * isto remove sequências de controle e HTML colado por engano, para que o
 * conteúdo permaneça texto em qualquer consumidor futuro.
 */
export function sanitizarTexto(valor) {
  if (valor === null || valor === undefined) return null
  const s = String(valor)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Blocos executáveis saem inteiros, com o conteúdo: manter o corpo de um
    // <script> como texto seria guardar código no banco.
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // Tags remanescentes, inclusive as sem par de fechamento.
    .replace(/<\s*\/?\s*(script|iframe|object|embed|style|link|meta)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
  const limpo = s.trim()
  return limpo === '' ? null : limpo
}

function sanitizarProfundo(valor, profundidade = 0) {
  if (profundidade > 6) return null
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'boolean' || typeof valor === 'number') return valor
  if (typeof valor === 'string') return sanitizarTexto(valor)
  if (Array.isArray(valor)) {
    return valor.slice(0, 200).map((v) => sanitizarProfundo(v, profundidade + 1))
  }
  if (typeof valor === 'object') {
    const saida = {}
    for (const [chave, v] of Object.entries(valor).slice(0, 100)) {
      const k = String(chave).slice(0, 80)
      saida[k] = sanitizarProfundo(v, profundidade + 1)
    }
    return saida
  }
  return null
}

const artigoSchema = z.object({
  artigo: z.string().trim().max(120),
  justificativa: z.string().trim().max(2000).optional().default(''),
})

const checklistSchema = z.object({
  texto: z.string().trim().min(1).max(500),
  feito: z.boolean().optional().default(false),
})

/** Schema base de item, comum a todos os quadros. */
export const itemSchemaBase = z.object({
  titulo: z.string().trim().min(1, 'Informe um título.').max(300),
  grupo_id: z.string().uuid('Grupo inválido.').nullable().optional(),
  status: texto(80).optional(),
  prioridade: z.enum(valoresPrioridade).optional(),
  responsavel: texto(160).optional(),
  co_responsavel: texto(160).optional(),
  diretoria: z
    .enum(valoresDiretoria)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  prazo: data.optional(),
  risco: texto(1000).optional(),
  blocker: texto(1000).optional(),
  proximo_passo: texto(1000).optional(),
  origem: texto(300).optional(),
  confidencialidade: z.enum(valoresConfidencialidade).optional(),
  descricao: textoLongo.optional(),
  dados: z.record(z.string(), z.unknown()).optional(),
  artigos: z.array(artigoSchema).max(30).optional(),
  checklist: z.array(checklistSchema).max(100).optional(),
})

/**
 * Valida um item para um quadro específico: além do schema base, restringe as
 * chaves de `dados` aos campos configurados e o status às opções do quadro.
 */
export function validarItem(slugQuadro, corpo, { parcial = false } = {}) {
  const quadro = obterQuadro(slugQuadro)
  if (!quadro) {
    return { ok: false, erros: [{ campo: 'quadro', mensagem: 'Quadro inexistente.' }] }
  }

  // Regra estatutária explícita, com mensagem própria: a Diretoria Financeira
  // é prevista apenas "quando instituída" (Art. 33º VII e Art. 44º) e não é
  // atribuível enquanto isso (Art. 33º §2º).
  if (corpo && typeof corpo.diretoria === 'string' && corpo.diretoria.trim() === 'financeira') {
    return {
      ok: false,
      erros: [
        {
          campo: 'diretoria',
          mensagem:
            'A Diretoria Financeira é prevista apenas "quando instituída" (Art. 33º VII e Art. 44º) ' +
            'e a Liga não a instituiu. Atribua à Presidência e registre o responsável designado ' +
            '(Art. 33º §2º e Art. 44º parágrafo único).',
        },
      ],
    }
  }

  const schema = parcial ? itemSchemaBase.partial() : itemSchemaBase
  const resultado = schema.safeParse(corpo ?? {})

  if (!resultado.success) {
    return {
      ok: false,
      erros: resultado.error.issues.map((i) => ({
        campo: i.path.join('.') || 'corpo',
        mensagem: i.message,
      })),
    }
  }

  const valor = resultado.data
  const erros = []

  if (valor.status !== undefined && valor.status !== null) {
    const permitidos = (quadro.statusOpcoes || []).map((o) => o.valor)
    if (!permitidos.includes(valor.status)) {
      erros.push({
        campo: 'status',
        mensagem: `Status inválido para este quadro. Use um de: ${permitidos.join(', ')}.`,
      })
    }
  }

  // Chaves de `dados` aceitas: apenas as declaradas na configuração do quadro.
  const chavesPermitidas = new Set(
    camposDoQuadro(quadro)
      .map((c) => c.campo)
      .filter((c) => c.startsWith('dados.'))
      .map((c) => c.slice('dados.'.length)),
  )

  const dados = {}
  if (valor.dados) {
    for (const [chave, v] of Object.entries(valor.dados)) {
      if (!chavesPermitidas.has(chave)) continue
      dados[chave] = sanitizarProfundo(v)
    }
  }

  const limpo = {}
  for (const coluna of COLUNAS_BASE_ITEM) {
    if (valor[coluna] === undefined) continue
    limpo[coluna] =
      coluna === 'prazo' || coluna === 'prioridade' || coluna === 'confidencialidade' || coluna === 'diretoria'
        ? valor[coluna]
        : sanitizarTexto(valor[coluna])
  }
  if (valor.grupo_id !== undefined) limpo.grupo_id = valor.grupo_id || null
  if (valor.dados !== undefined) limpo.dados = dados
  if (valor.artigos !== undefined) {
    limpo.artigos = valor.artigos.map((a) => ({
      artigo: sanitizarTexto(a.artigo) || '',
      justificativa: sanitizarTexto(a.justificativa) || '',
    }))
  }
  if (valor.checklist !== undefined) {
    limpo.checklist = valor.checklist.map((c) => ({
      texto: sanitizarTexto(c.texto) || '',
      feito: Boolean(c.feito),
    }))
  }

  if (!parcial && !limpo.titulo) {
    erros.push({ campo: 'titulo', mensagem: 'Informe um título.' })
  }

  if (erros.length > 0) return { ok: false, erros }
  return { ok: true, valor: limpo, quadro }
}

export const grupoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do grupo.').max(120),
  cor: z.enum(['pinho', 'verde', 'azul', 'roxo', 'ambar', 'vermelho', 'cinza']).optional(),
  artigo: texto(200).optional(),
})

export const loginSchema = z.object({
  email: emailValido,
  senha: z.string().min(1, 'Informe a senha.').max(300),
})

export const usuarioSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(160),
  email: emailValido,
  senha: z.string().min(12, 'A senha deve ter pelo menos 12 caracteres.').max(300),
  papel: z.enum(['administrador', 'presidencia', 'vice_presidencia', 'diretor', 'colaborador', 'leitor']),
  diretoria: z.enum(valoresDiretoria).nullable().optional().or(z.literal('').transform(() => null)),
})

export const usuarioAtualizacaoSchema = usuarioSchema
  .partial()
  .omit({ senha: true })
  .extend({
    ativo: z.boolean().optional(),
    senha: z.string().min(12).max(300).optional(),
  })

export const perguntaEstatutoSchema = z.object({
  pergunta: z.string().trim().min(5, 'Escreva a pergunta.').max(1000),
})

export const triagemSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para o documento.').max(300),
  conteudo: z.string().trim().min(20, 'O conteúdo precisa ter pelo menos 20 caracteres.').max(200000),
})

export const sugestaoIaSchema = z.object({
  titulo: z.string().trim().max(300).default(''),
  tipo: z
    .enum(['ata', 'decisao', 'tarefa', 'parceria', 'comunicacao', 'candidato', 'producao', 'evento', 'outro'])
    .default('outro'),
  diretoriaCompetente: z.string().trim().max(120).default(''),
  coResponsavel: z.string().trim().max(120).default(''),
  quadroDestino: z.string().trim().max(120).default(''),
  grupoDestino: z.string().trim().max(160).default(''),
  resumo: z.string().trim().max(4000).default(''),
  descricaoCompleta: z.string().trim().max(20000).default(''),
  confidencialidade: z.enum(valoresConfidencialidade).default('interno'),
  artigosAplicaveis: z
    .array(
      z.object({
        artigo: z.string().trim().max(120).default(''),
        justificativa: z.string().trim().max(2000).default(''),
      }),
    )
    .max(20)
    .default([]),
  prioridade: z.enum(valoresPrioridade).default('media'),
  prazo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null))
    .default(null),
  proximoPasso: z.string().trim().max(1000).default(''),
  organizacao: z.string().trim().max(300).default(''),
  email: z.string().trim().max(200).default(''),
  telefone: z.string().trim().max(60).default(''),
  responsavelSugerido: z.string().trim().max(160).default(''),
  riscos: z.array(z.string().trim().max(500)).max(20).default([]),
  justificativaDoRoteamento: z.string().trim().max(4000).default(''),
})

export { sanitizarProfundo }
