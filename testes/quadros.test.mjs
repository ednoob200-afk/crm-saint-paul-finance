import { describe, it, expect } from 'vitest'
import {
  DIRETORIAS,
  DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS,
  DIREITOS_DE_DECISAO,
  MENU,
  PAGINAS,
  QUADROS,
  QUORUNS,
  camposDoQuadro,
  obterQuadro,
  podeAdministrar,
  podeAprovarTriagem,
  podeMutar,
  rotuloDiretoria,
} from '@/lib/quadros'
import { artigoExiste, rotuloCanonico } from '@/lib/estatuto'

describe('estrutura dos quadros', () => {
  it('o menu tem 15 itens, em cinco seções', () => {
    const itens = MENU.flatMap((s) => s.itens)
    expect(itens).toHaveLength(15)
    expect(MENU).toHaveLength(5)
    expect(QUADROS.length + PAGINAS.length).toBe(15)
  })

  it('todo item do menu tem href, nome e descrição', () => {
    for (const item of MENU.flatMap((s) => s.itens)) {
      expect(item.href, `${item.slug} sem href`).toBeTruthy()
      expect(item.nome, `${item.slug} sem nome`).toBeTruthy()
      expect(item.descricao, `${item.slug} sem descrição`).toBeTruthy()
    }
  })

  it('não há slug repetido no menu', () => {
    const slugs = MENU.flatMap((s) => s.itens).map((i) => i.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('nenhuma Diretoria Financeira é atribuível', () => {
    expect(DIRETORIAS.map((d) => d.valor)).not.toContain('financeira')
    for (const d of DIRETORIAS) {
      expect(d.rotulo.toLowerCase()).not.toContain('financeira')
    }
  })

  it('a Diretoria Financeira consta como prevista e não instituída', () => {
    const prevista = DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS.find((d) => d.valor === 'financeira')
    expect(prevista).toBeTruthy()
    expect(prevista.situacao).toBe('Prevista, não instituída')
    expect(prevista.artigo).toBe('Art. 33º VII')
  })

  it('nenhum grupo de quadro cria uma Diretoria Financeira', () => {
    for (const quadro of QUADROS) {
      for (const grupo of quadro.grupos || []) {
        expect(
          grupo.nome.toLowerCase().includes('diretoria financeira'),
          `${quadro.slug}: grupo "${grupo.nome}"`,
        ).toBe(false)
      }
    }
  })

  it('a Operação tem grupo de orçamento sob a Presidência, sem diretoria própria', () => {
    const operacao = obterQuadro('operacao')
    const nomes = operacao.grupos.map((g) => g.nome)
    expect(nomes).toContain('Orçamento e prestação de contas')
    expect(nomes).toContain('Presidência')
  })

  it('todo quadro tem grupos, status e colunas', () => {
    for (const quadro of QUADROS) {
      expect(quadro.grupos?.length, `${quadro.slug} sem grupos`).toBeGreaterThan(0)
      expect(quadro.statusOpcoes?.length, `${quadro.slug} sem status`).toBeGreaterThan(0)
      expect(quadro.colunas?.length, `${quadro.slug} sem colunas`).toBeGreaterThan(0)
      expect(quadro.artigos?.length, `${quadro.slug} sem base estatutária`).toBeGreaterThan(0)
    }
  })

  it('não há campo repetido dentro de um quadro', () => {
    for (const quadro of QUADROS) {
      const campos = camposDoQuadro(quadro).map((c) => c.campo)
      expect(new Set(campos).size, `${quadro.slug} tem campo repetido`).toBe(campos.length)
    }
  })

  it('todo status tem valor e cor únicos no quadro', () => {
    for (const quadro of QUADROS) {
      const valores = quadro.statusOpcoes.map((o) => o.valor)
      expect(new Set(valores).size, `${quadro.slug} tem status repetido`).toBe(valores.length)
      for (const o of quadro.statusOpcoes) {
        expect(o.rotulo, `${quadro.slug}/${o.valor} sem rótulo`).toBeTruthy()
        expect(
          ['pinho', 'verde', 'azul', 'roxo', 'ambar', 'vermelho', 'cinza'],
          `${quadro.slug}/${o.valor} com cor inválida`,
        ).toContain(o.cor)
      }
    }
  })

  it('campo de seleção sempre traz opções', () => {
    for (const quadro of QUADROS) {
      for (const campo of camposDoQuadro(quadro)) {
        if (campo.tipo === 'select') {
          expect(campo.opcoes?.length, `${quadro.slug}/${campo.campo} sem opções`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('rotuloDiretoria marca a diretoria não instituída', () => {
    expect(rotuloDiretoria('presidencia')).toBe('Presidência')
    expect(rotuloDiretoria('financeira')).toContain('não instituída')
    expect(rotuloDiretoria(null)).toBe('—')
  })
})

describe('referências estatutárias', () => {
  it('todo artigo citado por um quadro existe no Estatuto vigente', () => {
    for (const quadro of QUADROS) {
      for (const referencia of quadro.artigos || []) {
        expect(artigoExiste(referencia), `${quadro.slug} cita ${referencia}`).toBe(true)
      }
      for (const grupo of quadro.grupos || []) {
        if (!grupo.artigo) continue
        // Grupos podem citar capítulo ("Cap. XXII") em vez de artigo.
        if (/cap/i.test(grupo.artigo)) continue
        for (const parte of grupo.artigo.split(',')) {
          if (!/\d/.test(parte)) continue
          expect(artigoExiste(parte), `${quadro.slug}/${grupo.nome} cita ${parte}`).toBe(true)
        }
      }
    }
  })

  it('todo artigo citado por uma página existe', () => {
    for (const pagina of PAGINAS) {
      for (const referencia of pagina.artigos || []) {
        expect(artigoExiste(referencia), `${pagina.slug} cita ${referencia}`).toBe(true)
      }
    }
  })

  it('todo artigo da tabela de quóruns existe', () => {
    for (const q of QUORUNS) {
      for (const parte of q.artigo.split(',')) {
        if (!/\d/.test(parte)) continue
        expect(artigoExiste(parte), `quórum "${q.materia}" cita ${parte}`).toBe(true)
      }
    }
  })

  it('todo artigo da tabela de decisões existe', () => {
    for (const d of DIREITOS_DE_DECISAO) {
      for (const parte of d.artigo.split(',')) {
        if (!/\d/.test(parte)) continue
        expect(artigoExiste(parte), `decisão "${d.materia}" cita ${parte}`).toBe(true)
      }
    }
  })

  it('toda diretoria instituída aponta para um artigo real de competência', () => {
    for (const d of DIRETORIAS) {
      expect(rotuloCanonico(d.artigo), `${d.valor} cita ${d.artigo}`).toBeTruthy()
    }
  })

  it('as competências apontadas correspondem às diretorias do Art. 38º ao Art. 43º', () => {
    const esperado = {
      presidencia: 'Art. 38º',
      vice_presidencia: 'Art. 39º',
      formacao: 'Art. 40º',
      eventos: 'Art. 41º',
      institucional: 'Art. 42º',
      comunicacao: 'Art. 43º',
    }
    for (const [valor, artigo] of Object.entries(esperado)) {
      expect(DIRETORIAS.find((d) => d.valor === valor).artigo).toBe(artigo)
    }
  })
})

describe('permissões por papel', () => {
  it('leitor não muta', () => {
    expect(podeMutar('leitor')).toBe(false)
    expect(podeAprovarTriagem('leitor')).toBe(false)
    expect(podeAdministrar('leitor')).toBe(false)
  })

  it('colaborador muta, mas não distribui nem administra', () => {
    expect(podeMutar('colaborador')).toBe(true)
    expect(podeAprovarTriagem('colaborador')).toBe(false)
    expect(podeAdministrar('colaborador')).toBe(false)
  })

  it('diretor distribui documento triado', () => {
    expect(podeAprovarTriagem('diretor')).toBe(true)
    expect(podeAdministrar('diretor')).toBe(false)
  })

  it('presidência e administrador administram', () => {
    expect(podeAdministrar('presidencia')).toBe(true)
    expect(podeAdministrar('administrador')).toBe(true)
  })

  it('papel desconhecido não recebe permissão alguma', () => {
    expect(podeMutar('inventado')).toBe(false)
    expect(podeAdministrar(undefined)).toBe(false)
  })
})
