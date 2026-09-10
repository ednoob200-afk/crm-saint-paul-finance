import { describe, it, expect } from 'vitest'
import { separarEmails } from '@/lib/emails'

describe('leitura de listas de e-mail', () => {
  it('aceita uma lista por linha', () => {
    const r = separarEmails('joao@saintpaul.edu.br\nmaria@saintpaul.edu.br')
    expect(r.validos).toEqual(['joao@saintpaul.edu.br', 'maria@saintpaul.edu.br'])
    expect(r.invalidos).toEqual([])
  })

  it('aceita vírgula e ponto e vírgula juntos', () => {
    const r = separarEmails('a@b.com, c@d.com; e@f.com')
    expect(r.validos).toEqual(['a@b.com', 'c@d.com', 'e@f.com'])
  })

  it('normaliza caixa e espaços', () => {
    const r = separarEmails('  JOAO.Silva@SaintPaul.Edu.BR  ')
    expect(r.validos).toEqual(['joao.silva@saintpaul.edu.br'])
  })

  it('remove repetições, mesmo com caixa diferente', () => {
    const r = separarEmails('a@b.com\nA@B.COM\na@b.com')
    expect(r.validos).toEqual(['a@b.com'])
    expect(r.repetidos).toHaveLength(2)
  })

  it('separa os inválidos em vez de aceitar em silêncio', () => {
    const r = separarEmails('valido@spf.com\nsem-arroba\n@sem-usuario.com\nsem@ponto')
    expect(r.validos).toEqual(['valido@spf.com'])
    expect(r.invalidos).toEqual(['sem-arroba', '@sem-usuario.com', 'sem@ponto'])
  })

  it('recusa e-mail absurdamente longo', () => {
    const longo = `${'a'.repeat(250)}@spf.com`
    const r = separarEmails(longo)
    expect(r.validos).toEqual([])
    expect(r.invalidos).toHaveLength(1)
  })

  it('não quebra com entrada vazia ou nula', () => {
    for (const entrada of ['', '   ', '\n\n,,;', null, undefined]) {
      const r = separarEmails(entrada)
      expect(r.validos).toEqual([])
    }
  })

  it('ignora linhas em branco no meio da lista', () => {
    const r = separarEmails('a@b.com\n\n\nc@d.com\n')
    expect(r.validos).toEqual(['a@b.com', 'c@d.com'])
  })
})
