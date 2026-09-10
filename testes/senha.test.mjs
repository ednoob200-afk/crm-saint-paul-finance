import { describe, it, expect } from 'vitest'
import { gerarHashSenha, verificarSenha } from '@/lib/senha.mjs'

describe('hash de senha', () => {
  it('gera hash no formato esperado e confere a senha correta', async () => {
    const hash = await gerarHashSenha('senha-institucional-2026')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(hash.split('$')).toHaveLength(6)
    expect(await verificarSenha('senha-institucional-2026', hash)).toBe(true)
  })

  it('nunca guarda a senha em texto puro', async () => {
    const senha = 'senha-institucional-2026'
    const hash = await gerarHashSenha(senha)
    expect(hash).not.toContain(senha)
  })

  it('recusa senha incorreta', async () => {
    const hash = await gerarHashSenha('senha-institucional-2026')
    expect(await verificarSenha('senha-errada-2026', hash)).toBe(false)
  })

  it('gera sal diferente a cada chamada', async () => {
    const a = await gerarHashSenha('senha-institucional-2026')
    const b = await gerarHashSenha('senha-institucional-2026')
    expect(a).not.toBe(b)
  })

  it('exige pelo menos doze caracteres', async () => {
    await expect(gerarHashSenha('curta')).rejects.toThrow()
  })

  it('não quebra com hash malformado', async () => {
    expect(await verificarSenha('qualquer', 'lixo')).toBe(false)
    expect(await verificarSenha('qualquer', 'scrypt$a$b$c$d$e')).toBe(false)
    expect(await verificarSenha('qualquer', null)).toBe(false)
  })
})
