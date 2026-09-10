/**
 * Respostas padronizadas das rotas de API.
 *
 * Nenhum stack trace, nome de tabela, string de conexão ou mensagem bruta do
 * provedor chega ao cliente. O detalhe técnico fica no log do servidor.
 */

export function ok(dados, status = 200) {
  return Response.json(dados, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export function erro(mensagem, status = 400, extra = {}) {
  return Response.json(
    { erro: mensagem, ...extra },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export function erroDeValidacao(erros) {
  return Response.json(
    { erro: 'Dados inválidos.', erros },
    { status: 422, headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * Converte qualquer exceção em resposta segura. Erros conhecidos carregam
 * `status` e mensagem própria; o resto vira 500 genérico.
 */
export function tratarErro(e, contexto = 'rota') {
  const conhecidos = ['ErroAutorizacao', 'ErroIA', 'ErroStorage', 'ErroDeConfiguracao']

  if (e && conhecidos.includes(e.name)) {
    if (e.name === 'ErroDeConfiguracao') {
      console.error(`[${contexto}] configuração:`, e.message)
      return erro(e.message, 503, { codigo: e.codigo })
    }
    return erro(e.message, e.status || 400, e.codigo ? { codigo: e.codigo } : {})
  }

  // Violações comuns do Postgres, traduzidas sem expor estrutura interna.
  if (e && e.code === '23505') {
    return erro('Já existe um registro com este identificador.', 409)
  }
  if (e && e.code === '23503') {
    return erro('Referência inválida: o registro relacionado não existe.', 409)
  }
  if (e && (e.code === '42P01' || e.code === '42703')) {
    console.error(`[${contexto}] esquema desatualizado:`, e.message)
    return erro(
      'O banco de dados ainda não foi migrado. Rode `npm run migrate` com a DATABASE_URL do ambiente.',
      503,
      { codigo: 'migracao_pendente' },
    )
  }
  if (e && (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.code === '28P01')) {
    console.error(`[${contexto}] conexão com o banco:`, e.message)
    return erro(
      'Não foi possível conectar ao banco de dados. Verifique a variável DATABASE_URL.',
      503,
      { codigo: 'banco_indisponivel' },
    )
  }

  console.error(`[${contexto}] erro não tratado:`, e?.message, e?.stack)
  return erro('Erro interno. A ocorrência foi registrada no servidor.', 500)
}

/** Leitura de corpo JSON com limite de tamanho e erro legível. */
export async function lerJson(request, limiteBytes = 1_000_000) {
  const tamanho = Number(request.headers.get('content-length') || 0)
  if (tamanho > limiteBytes) {
    const e = new Error(`Corpo da requisição acima de ${Math.round(limiteBytes / 1024)} KB.`)
    e.name = 'ErroStorage'
    e.status = 413
    throw e
  }
  try {
    return await request.json()
  } catch {
    const e = new Error('Corpo da requisição não é um JSON válido.')
    e.name = 'ErroStorage'
    e.status = 400
    throw e
  }
}
