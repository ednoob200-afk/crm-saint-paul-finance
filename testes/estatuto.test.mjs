import { describe, it, expect } from 'vitest'
import {
  ARTIGOS,
  CAPITULOS,
  artigoExiste,
  buscarArtigos,
  numeroDoRotulo,
  obterArtigo,
  rotuloCanonico,
  textoCompletoDoEstatuto,
} from '@/lib/estatuto'

describe('índice do Estatuto', () => {
  it('carrega os 121 artigos e os 26 capítulos', () => {
    expect(ARTIGOS).toHaveLength(121)
    expect(CAPITULOS).toHaveLength(26)
  })

  it('não tem lacuna na numeração', () => {
    const numeros = ARTIGOS.map((a) => a.numero)
    for (let n = 1; n <= 121; n += 1) expect(numeros).toContain(n)
  })

  it('resolve rótulos em várias formas', () => {
    expect(numeroDoRotulo('Art. 42º')).toBe(42)
    expect(numeroDoRotulo('art 42')).toBe(42)
    expect(numeroDoRotulo('Art. 42º II')).toBe(42)
    expect(numeroDoRotulo('sem número')).toBe(null)
    expect(numeroDoRotulo('Art. 999º')).toBe(null)
  })

  it('normaliza a referência para o rótulo canônico', () => {
    expect(rotuloCanonico('art 42')).toBe('Art. 42º')
    expect(rotuloCanonico('Art. 999º')).toBe(null)
  })

  it('nega artigo inexistente em vez de inventar', () => {
    expect(artigoExiste('Art. 121º')).toBe(true)
    expect(artigoExiste('Art. 122º')).toBe(false)
    expect(artigoExiste('Art. 500º')).toBe(false)
    expect(obterArtigo('Art. 900º')).toBe(null)
  })

  it('o Art. 42º II trata do CRM institucional', () => {
    const artigo = obterArtigo(42)
    expect(artigo.texto).toContain('CRM')
    expect(artigo.capituloTitulo).toContain('COMPETÊNCIAS')
  })

  it('o Art. 33º prevê a Diretoria Financeira apenas quando instituída', () => {
    const artigo = obterArtigo(33)
    expect(artigo.texto).toContain('Diretoria Financeira, quando instituída')
    expect(artigo.texto).toContain('inexistência temporária de Diretoria Financeira')
  })

  it('busca por termo encontra os artigos de quórum de alteração estatutária', () => {
    const resultados = buscarArtigos('alteração estatutária quórum')
    expect(resultados.length).toBeGreaterThan(0)
    expect(resultados.map((a) => a.numero)).toContain(112)
  })

  it('busca por número devolve exatamente o artigo pedido', () => {
    const resultados = buscarArtigos('Art. 67')
    expect(resultados).toHaveLength(1)
    expect(resultados[0].numero).toBe(67)
  })

  it('busca por capítulo devolve os artigos daquele capítulo', () => {
    const resultados = buscarArtigos('capítulo XI')
    expect(resultados.length).toBeGreaterThan(0)
    expect(resultados.every((a) => a.capitulo === 'XI')).toBe(true)
  })

  it('o texto completo cobre o Estatuto inteiro', () => {
    const texto = textoCompletoDoEstatuto()
    expect(texto).toContain('Art. 1º')
    expect(texto).toContain('Art. 121º')
    expect(texto.length).toBeGreaterThan(50_000)
  })
})
