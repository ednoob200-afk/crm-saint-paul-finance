/**
 * Hash de senha com scrypt da biblioteca padrão do Node.
 *
 * Módulo .mjs porque é usado tanto pelas rotas do Next quanto pelos scripts
 * de linha de comando, que rodam sem bundler.
 *
 * Formato armazenado: scrypt$N$r$p$sal_base64$hash_base64
 * Nenhuma senha em texto puro é aceita ou guardada em qualquer camada.
 */
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'

const N = 16384
const R = 8
const P = 1
const TAMANHO = 64

function derivar(senha, sal, n = N, r = R, p = P, tamanho = TAMANHO) {
  return new Promise((resolvido, rejeitado) => {
    scrypt(
      senha.normalize('NFKC'),
      sal,
      tamanho,
      { N: n, r, p, maxmem: 128 * n * r * 2 },
      (erro, chave) => (erro ? rejeitado(erro) : resolvido(chave)),
    )
  })
}

export async function gerarHashSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 12) {
    throw new Error('A senha deve ter pelo menos 12 caracteres.')
  }
  const sal = randomBytes(16)
  const chave = await derivar(senha, sal)
  return ['scrypt', N, R, P, sal.toString('base64'), chave.toString('base64')].join('$')
}

export async function verificarSenha(senha, armazenado) {
  if (typeof senha !== 'string' || typeof armazenado !== 'string') return false
  const partes = armazenado.split('$')
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false

  const n = Number(partes[1])
  const r = Number(partes[2])
  const p = Number(partes[3])
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false

  let sal
  let esperado
  try {
    sal = Buffer.from(partes[4], 'base64')
    esperado = Buffer.from(partes[5], 'base64')
  } catch {
    return false
  }
  if (sal.length === 0 || esperado.length === 0) return false

  let obtido
  try {
    obtido = await derivar(senha, sal, n, r, p, esperado.length)
  } catch {
    return false
  }
  if (obtido.length !== esperado.length) return false
  return timingSafeEqual(obtido, esperado)
}
