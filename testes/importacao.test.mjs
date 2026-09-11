import { describe, it, expect } from 'vitest'
import {
  analisarPlanilha,
  chave,
  detectarDelimitador,
  mapearColunas,
  papelSugeridoPeloCargo,
  prepararImportacao,
} from '@/lib/importacao'

/** Cabeçalho igual ao da Base de Membros da Liga. */
const CABECALHO = [
  'Nome completo',
  'E-mail Saint Paul',
  'Telefone / WhatsApp',
  'LinkedIn',
  'Curso',
  'Semestre atual',
  'Processo seletivo de ingresso',
  'Categoria',
  'Cargo atual',
  'Diretoria / Frente',
  'Status',
].join('\t')

function linha(...campos) {
  return campos.join('\t')
}

describe('leitura do texto colado', () => {
  it('reconhece tabulação, que é o que sai de uma planilha', () => {
    expect(detectarDelimitador('a\tb\tc\n1\t2\t3')).toBe('\t')
  })

  it('reconhece ponto e vírgula e vírgula', () => {
    expect(detectarDelimitador('a;b;c\n1;2;3')).toBe(';')
    expect(detectarDelimitador('a,b,c\n1,2,3')).toBe(',')
  })

  it('respeita aspas em CSV', () => {
    const { linhas } = analisarPlanilha('nome,obs\n"Silva, João","disse ""sim"""')
    expect(linhas[0]).toEqual(['Silva, João', 'disse "sim"'])
  })

  it('pula título e linhas em branco antes do cabeçalho', () => {
    const texto = ['BASE DE MEMBROS - SAINT PAUL FINANCE', '', '', CABECALHO, linha('Ana', 'ana@spf.br')].join(
      '\n',
    )
    const { cabecalho, linhas } = analisarPlanilha(texto)
    expect(cabecalho[0]).toBe('Nome completo')
    expect(linhas).toHaveLength(1)
  })

  it('normaliza rótulos ignorando acento e pontuação', () => {
    expect(chave('Diretoria / Frente')).toBe('diretoria frente')
    expect(chave('E-mail Saint Paul')).toBe('e mail saint paul')
  })
})

describe('casamento de colunas', () => {
  it('reconhece todas as colunas da planilha da Liga', () => {
    const { mapa, ignoradas } = mapearColunas(CABECALHO.split('\t'), 'membros')
    expect(mapa.titulo).toBe(0)
    expect(mapa['dados.email_institucional']).toBe(1)
    expect(mapa['dados.telefone']).toBe(2)
    expect(mapa['dados.linkedin']).toBe(3)
    expect(mapa['dados.curso']).toBe(4)
    expect(mapa['dados.semestre']).toBe(5)
    expect(mapa['dados.processo_ingresso']).toBe(6)
    expect(mapa.__grupo).toBe(7)
    expect(mapa['dados.funcao']).toBe(8)
    expect(mapa.diretoria).toBe(9)
    expect(mapa.status).toBe(10)
    expect(ignoradas).toEqual([])
  })

  it('separa colunas que não pertencem ao quadro', () => {
    const { ignoradas } = mapearColunas(['Nome completo', 'Time do coração'], 'membros')
    expect(ignoradas).toEqual(['Time do coração'])
  })
})

describe('importação para Membros & Trainees', () => {
  const texto = [
    'BASE DE MEMBROS - SAINT PAUL FINANCE',
    '',
    CABECALHO,
    linha(
      'Matheus Pardinho Pinto',
      'matheus.pinto.gadm@saintpaul.edu.br',
      '(11) 95571-4697',
      'https://www.linkedin.com/in/matheus',
      'Administração de Empresas',
      '2º semestre',
      '2026.2',
      'Fundador',
      'Presidente',
      'Presidência',
      'Ativo',
    ),
    linha(
      'Henri Alcide',
      'henri@saintpaul.edu.br',
      '',
      '',
      'Administração de Empresas',
      '2º semestre',
      '2026.2',
      'Membro Efetivo',
      'Membro',
      '',
      'Ativo',
    ),
  ].join('\n')

  it('lê as duas linhas e traduz os valores', () => {
    const r = prepararImportacao('membros', texto)
    expect(r.ok).toBe(true)
    expect(r.total).toBe(2)

    const primeiro = r.itens[0].item
    expect(primeiro.titulo).toBe('Matheus Pardinho Pinto')
    expect(primeiro.diretoria).toBe('presidencia')
    expect(primeiro.status).toBe('ativo')
    expect(primeiro.__grupo).toBe('Membros Fundadores')
    expect(primeiro.dados.email_institucional).toBe('matheus.pinto.gadm@saintpaul.edu.br')
    expect(primeiro.dados.funcao).toBe('Presidente')
    expect(primeiro.dados.processo_ingresso).toBe('2026.2')
  })

  it('casa "Membro Efetivo" com o grupo "Membros Efetivos"', () => {
    const r = prepararImportacao('membros', texto)
    expect(r.itens[1].item.__grupo).toBe('Membros Efetivos')
  })

  it('não inventa diretoria quando a célula está vazia', () => {
    const r = prepararImportacao('membros', texto)
    expect(r.itens[1].item.diretoria).toBeUndefined()
  })

  it('aponta o Art. 13º quando Membro Efetivo não é de Administração', () => {
    const comOutroCurso = texto.replace(
      'Administração de Empresas\t2º semestre\t2026.2\tMembro Efetivo',
      'Gestão Financeira\t2º semestre\t2026.2\tMembro Efetivo',
    )
    const r = prepararImportacao('membros', comOutroCurso)
    const avisos = r.itens.flatMap((i) => i.avisos).join(' ')
    expect(avisos).toContain('Art. 13º')
    expect(avisos).toContain('Gestão Financeira')
  })

  it('recusa a Diretoria Financeira citando o Estatuto', () => {
    const comFinanceira = texto.replace('\tPresidência\t', '\tFinanceira\t')
    const r = prepararImportacao('membros', comFinanceira)
    const avisos = r.itens.flatMap((i) => i.avisos).join(' ')
    expect(avisos).toContain('Art. 33º VII')
    expect(r.itens[0].item.diretoria).toBeUndefined()
  })

  it('ignora linha sem nome em vez de criar item vazio', () => {
    const comVazia = `${texto}\n${linha('', 'sobra@spf.br')}`
    expect(prepararImportacao('membros', comVazia).total).toBe(2)
  })

  it('recusa planilha sem coluna de nome', () => {
    const r = prepararImportacao('membros', 'E-mail\tCurso\na@b.com\tAdministração')
    expect(r.ok).toBe(false)
    expect(r.erro).toContain('coluna do nome')
  })

  it('recusa quadro inexistente', () => {
    expect(prepararImportacao('inexistente', texto).ok).toBe(false)
  })
})

describe('datas', () => {
  it('aceita AAAA-MM-DD e DD/MM/AAAA', () => {
    const base = 'Nome completo\tData de entrada\nAna\t2026-03-01\nBeto\t15/08/2026'
    const r = prepararImportacao('membros', base)
    expect(r.itens[0].item.dados.entrada).toBe('2026-03-01')
    expect(r.itens[1].item.dados.entrada).toBe('2026-08-15')
  })

  it('avisa em vez de inventar quando a data é ilegível', () => {
    const r = prepararImportacao('membros', 'Nome completo\tData de entrada\nAna\tsemestre passado')
    expect(r.itens[0].avisos.join(' ')).toContain('não reconhecida')
    expect(r.itens[0].item.dados.entrada).toBeUndefined()
  })
})

describe('papel sugerido pelo cargo', () => {
  it('mapeia a diretoria executiva', () => {
    expect(papelSugeridoPeloCargo('Presidente')).toBe('presidencia')
    expect(papelSugeridoPeloCargo('Vice-presidente')).toBe('vice_presidencia')
    expect(papelSugeridoPeloCargo('Diretor')).toBe('diretor')
    expect(papelSugeridoPeloCargo('Diretora de Formação')).toBe('diretor')
  })

  it('membro vira colaborador e trainee vira leitor', () => {
    expect(papelSugeridoPeloCargo('Membro')).toBe('colaborador')
    expect(papelSugeridoPeloCargo('Trainee')).toBe('leitor')
    expect(papelSugeridoPeloCargo('')).toBe('colaborador')
  })
})
