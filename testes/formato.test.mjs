import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  diasAte,
  formatarData,
  iniciais,
  lerCampo,
  montarAlteracao,
  nomeDoMes,
  partesDaData,
  situacaoDoPrazo,
  truncar,
} from '@/lib/formato'

afterEach(() => {
  vi.useRealTimers()
})

function fixarHoje(iso) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${iso}T12:00:00`))
}

describe('datas', () => {
  it('lê a data sem deslocar o dia por fuso', () => {
    expect(partesDaData('2026-09-30')).toEqual({ ano: 2026, mes: 9, dia: 30 })
    expect(formatarData('2026-09-30')).toBe('30/09/2026')
    expect(formatarData('2026-01-01')).toBe('01/01/2026')
  })

  it('trata valores ausentes ou inválidos', () => {
    expect(partesDaData(null)).toBe(null)
    expect(partesDaData('30/09/2026')).toBe(null)
    expect(formatarData(undefined)).toBe('—')
    expect(diasAte(null)).toBe(null)
    expect(situacaoDoPrazo(null)).toBe(null)
  })

  it('classifica o prazo em vencido, próximo e normal', () => {
    fixarHoje('2026-09-10')
    expect(situacaoDoPrazo('2026-09-09')).toBe('vencida')
    expect(situacaoDoPrazo('2026-09-10')).toBe('proxima')
    expect(situacaoDoPrazo('2026-09-17')).toBe('proxima')
    expect(situacaoDoPrazo('2026-09-18')).toBe('normal')
  })

  it('conta os dias corretamente na virada do mês', () => {
    fixarHoje('2026-09-30')
    expect(diasAte('2026-10-01')).toBe(1)
    expect(diasAte('2026-09-29')).toBe(-1)
  })

  it('nomeia o mês em português', () => {
    expect(nomeDoMes(2026, 9)).toBe('setembro de 2026')
    expect(nomeDoMes(2026, 3)).toBe('março de 2026')
  })
})

describe('iniciais do avatar', () => {
  it('usa primeiro e último nome', () => {
    expect(iniciais('Ana Paula Souza')).toBe('AS')
    expect(iniciais('Eduardo')).toBe('Ed')
  })

  it('não quebra com valor vazio', () => {
    expect(iniciais('')).toBe('')
    expect(iniciais(null)).toBe('')
    expect(iniciais('   ')).toBe('')
  })
})

describe('leitura e escrita de campos', () => {
  const item = { titulo: 'Ata', status: null, dados: { organizacao: 'Banco X' } }

  it('lê coluna base e campo em dados', () => {
    expect(lerCampo(item, 'titulo')).toBe('Ata')
    expect(lerCampo(item, 'dados.organizacao')).toBe('Banco X')
  })

  it('devolve nulo em vez de quebrar quando o campo não existe', () => {
    expect(lerCampo(item, 'dados.inexistente')).toBe(null)
    expect(lerCampo(item, 'inexistente')).toBe(null)
    expect(lerCampo(null, 'titulo')).toBe(null)
    expect(lerCampo(item, null)).toBe(null)
    expect(lerCampo({ titulo: 'x' }, 'dados.organizacao')).toBe(null)
  })

  it('monta o corpo do PATCH para os dois formatos', () => {
    expect(montarAlteracao('status', 'concluido')).toEqual({ status: 'concluido' })
    expect(montarAlteracao('dados.organizacao', 'Asset Y')).toEqual({
      dados: { organizacao: 'Asset Y' },
    })
  })
})

describe('truncar', () => {
  it('encurta apenas o que passa do limite', () => {
    expect(truncar('curto', 10)).toBe('curto')
    expect(truncar('abcdefghij', 5)).toBe('abcd…')
    expect(truncar(null, 5)).toBe('')
  })
})
