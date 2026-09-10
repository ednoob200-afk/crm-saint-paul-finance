/**
 * Autenticação e autorização. Toda verificação acontece no servidor.
 *
 * O navegador recebe apenas um cookie HttpOnly com um token opaco. O banco
 * guarda somente o hash desse token, de modo que um vazamento de leitura da
 * tabela não permite reutilizar sessões.
 */

import { cookies } from 'next/headers'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { linhas, primeira, consultar } from '@/lib/db'
import { NIVEL_PAPEL } from '@/lib/quadros'

const NOME_COOKIE = 'spf_sessao'
const DURACAO_HORAS = 12

class ErroAutorizacao extends Error {
  constructor(mensagem, status = 401) {
    super(mensagem)
    this.name = 'ErroAutorizacao'
    this.status = status
  }
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function segredoConfigurado() {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 24)
}

/**
 * Token opaco de 32 bytes, assinado com AUTH_SECRET para que um token forjado
 * seja rejeitado antes de qualquer consulta ao banco.
 */
function gerarToken() {
  const bruto = randomBytes(32).toString('base64url')
  const assinatura = createHash('sha256')
    .update(`${bruto}.${process.env.AUTH_SECRET}`)
    .digest('base64url')
    .slice(0, 32)
  return `${bruto}.${assinatura}`
}

function tokenAssinaturaValida(token) {
  if (typeof token !== 'string') return false
  const partes = token.split('.')
  if (partes.length !== 2) return false
  const esperada = createHash('sha256')
    .update(`${partes[0]}.${process.env.AUTH_SECRET}`)
    .digest('base64url')
    .slice(0, 32)
  const a = Buffer.from(partes[1])
  const b = Buffer.from(esperada)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function criarSessao(usuarioId, { userAgent = null, ip = null } = {}) {
  if (!segredoConfigurado()) {
    throw new ErroAutorizacao(
      'AUTH_SECRET não está configurado. Defina um segredo de sessão antes de permitir login.',
      503,
    )
  }
  const token = gerarToken()
  const expiraEm = new Date(Date.now() + DURACAO_HORAS * 3600 * 1000)

  await consultar(
    `INSERT INTO sessoes (usuario_id, token_hash, expira_em, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, hashToken(token), expiraEm, userAgent?.slice(0, 300) || null, ip],
  )

  const jar = await cookies()
  jar.set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiraEm,
  })

  // Limpeza oportunista das sessões vencidas.
  await consultar('DELETE FROM sessoes WHERE expira_em < now()').catch(() => {})

  return { expiraEm }
}

export async function encerrarSessao() {
  const jar = await cookies()
  const token = jar.get(NOME_COOKIE)?.value
  if (token) {
    await consultar('DELETE FROM sessoes WHERE token_hash = $1', [hashToken(token)]).catch(
      () => {},
    )
  }
  jar.set(NOME_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Usuário da sessão atual, ou null. Nunca lança por falta de sessão, para que
 * páginas públicas possam consultar sem tratamento especial.
 */
export async function sessaoAtual() {
  if (!segredoConfigurado()) return null

  let token
  try {
    const jar = await cookies()
    token = jar.get(NOME_COOKIE)?.value
  } catch {
    return null
  }
  if (!token || !tokenAssinaturaValida(token)) return null

  try {
    const usuario = await primeira(
      `SELECT u.id, u.nome, u.email, u.papel, u.diretoria, u.ativo, s.expira_em
         FROM sessoes s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = $1
          AND s.expira_em > now()
        LIMIT 1`,
      [hashToken(token)],
    )
    if (!usuario || !usuario.ativo) return null
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      diretoria: usuario.diretoria,
      expiraEm: usuario.expira_em,
    }
  } catch {
    // Banco indisponível: trata como não autenticado em vez de vazar o erro.
    return null
  }
}

export async function exigirSessao() {
  const usuario = await sessaoAtual()
  if (!usuario) throw new ErroAutorizacao('Autenticação necessária.', 401)
  return usuario
}

export async function exigirPapel(papelMinimo) {
  const usuario = await exigirSessao()
  const nivel = NIVEL_PAPEL[usuario.papel] || 0
  if (nivel < (NIVEL_PAPEL[papelMinimo] || 0)) {
    throw new ErroAutorizacao('Seu papel não autoriza esta operação.', 403)
  }
  return usuario
}

/**
 * Defesa contra CSRF. O cookie é SameSite=Lax, o que já barra POST de outro
 * site; a checagem de origem cobre o restante.
 */
export function verificarOrigem(request) {
  const metodo = request.method.toUpperCase()
  if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return
  const origem = request.headers.get('origin')
  if (!origem) return // cliente não-navegador; a sessão continua sendo exigida
  let host
  try {
    host = new URL(origem).host
  } catch {
    throw new ErroAutorizacao('Origem inválida.', 403)
  }
  const esperado = request.headers.get('host')
  if (esperado && host !== esperado) {
    throw new ErroAutorizacao('Origem não permitida.', 403)
  }
}

export function ipDaRequisicao(request) {
  const encaminhado = request.headers.get('x-forwarded-for')
  if (encaminhado) return encaminhado.split(',')[0].trim().slice(0, 64)
  return request.headers.get('x-real-ip')?.slice(0, 64) || null
}

/** Trilha de auditoria. Nunca recebe senhas, tokens ou chaves. */
export async function registrarAuditoria({ usuario, papel, acao, recurso, detalhe, ip }) {
  try {
    await consultar(
      `INSERT INTO auditoria (usuario, papel, acao, recurso, detalhe, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        usuario || null,
        papel || null,
        acao,
        recurso || null,
        detalhe ? String(detalhe).slice(0, 1000) : null,
        ip || null,
      ],
    )
  } catch (erro) {
    console.error('[auditoria] não foi possível registrar:', erro.message)
  }
}

export async function listarAuditoria(limite = 100) {
  return linhas(
    `SELECT usuario, papel, acao, recurso, detalhe, criado_em
       FROM auditoria ORDER BY criado_em DESC LIMIT $1`,
    [Math.min(Number(limite) || 100, 500)],
  )
}

export { ErroAutorizacao, NOME_COOKIE }
