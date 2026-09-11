/**
 * Importação em lote a partir de planilha colada.
 *
 * Módulo puro: interpreta o texto, casa as colunas com os campos do quadro,
 * traduz os valores para o vocabulário do sistema e aponta o que precisa de
 * decisão humana. Não grava nada — quem grava é a rota, depois da conferência.
 *
 * Aceita o que sai de um Ctrl+C do Excel ou do Google Sheets (separado por
 * tabulação) e também CSV com vírgula ou ponto e vírgula.
 */

import {
  CONFIDENCIALIDADE,
  DIRETORIAS,
  DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS,
  PRIORIDADES,
  camposDoQuadro,
  obterQuadro,
} from '@/lib/quadros'

export const LIMITE_LINHAS = 300

/** Compara rótulos ignorando acento, caixa e pontuação. */
export function chave(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Nomes de coluna aceitos para cada campo, por quadro. O primeiro casamento
 * vence, então os mais específicos vêm antes.
 */
const ALIASES = {
  comum: {
    titulo: ['titulo', 'nome', 'nome completo', 'item', 'assunto'],
    responsavel: ['responsavel', 'owner', 'dono'],
    co_responsavel: ['co responsavel', 'coresponsavel', 'segundo responsavel'],
    diretoria: ['diretoria', 'diretoria frente', 'frente', 'area'],
    status: ['status', 'situacao', 'etapa'],
    prioridade: ['prioridade'],
    prazo: ['prazo', 'data limite', 'deadline', 'vencimento'],
    risco: ['risco'],
    blocker: ['blocker', 'bloqueio', 'impedimento'],
    proximo_passo: ['proximo passo', 'next step', 'proxima acao'],
    origem: ['origem', 'fonte'],
    confidencialidade: ['confidencialidade', 'sigilo'],
    descricao: ['descricao', 'descricao detalhada', 'detalhes', 'observacoes gerais'],
    __grupo: ['grupo', 'categoria', 'classificacao'],
  },
  membros: {
    'dados.email_institucional': ['e mail saint paul', 'email saint paul', 'e mail institucional', 'email institucional', 'e mail', 'email'],
    'dados.email_pessoal': ['e mail pessoal', 'email pessoal'],
    'dados.telefone': ['telefone whatsapp', 'telefone', 'whatsapp', 'celular', 'contato'],
    'dados.linkedin': ['linkedin', 'perfil linkedin'],
    'dados.curso': ['curso', 'graduacao'],
    'dados.semestre': ['semestre atual', 'semestre', 'periodo'],
    'dados.processo_ingresso': ['processo seletivo de ingresso', 'processo seletivo', 'ingresso', 'ciclo de ingresso'],
    'dados.funcao': ['cargo atual', 'cargo', 'funcao', 'papel'],
    'dados.entrada': ['data de entrada', 'entrada', 'admissao'],
    'dados.saida': ['data de saida', 'saida', 'desligamento'],
    'dados.habilidades': ['habilidades', 'competencias', 'skills'],
    'dados.observacoes': ['observacoes', 'obs', 'notas'],
  },
  crm: {
    'dados.organizacao': ['organizacao', 'empresa', 'instituicao'],
    'dados.cargo': ['cargo', 'posicao'],
    'dados.email': ['e mail', 'email'],
    'dados.telefone': ['telefone', 'whatsapp', 'celular'],
    'dados.linkedin': ['linkedin'],
    'dados.ultimo_contato': ['ultimo contato'],
    'dados.observacoes': ['observacoes', 'obs'],
  },
  'processo-seletivo': {
    'dados.email': ['e mail', 'email'],
    'dados.telefone': ['telefone', 'whatsapp', 'celular'],
    'dados.curso_semestre': ['curso e semestre', 'curso', 'semestre'],
    'dados.disponibilidade': ['disponibilidade'],
    'dados.observacoes': ['observacoes', 'obs'],
  },
}

/**
 * Traduções de valor para o vocabulário do sistema. Fora daqui, o valor entra
 * como veio e a conferência humana decide.
 */
const DIRETORIA_POR_CHAVE = new Map([
  ...DIRETORIAS.map((d) => [chave(d.rotulo), d.valor]),
  ...DIRETORIAS.map((d) => [chave(d.valor), d.valor]),
  ['presidencia', 'presidencia'],
  ['vice presidencia', 'vice_presidencia'],
  ['vice presidente', 'vice_presidencia'],
  ['presidente', 'presidencia'],
  ['formacao', 'formacao'],
  ['institucional', 'institucional'],
  ['eventos', 'eventos'],
  ['comunicacao', 'comunicacao'],
])

const CHAVES_NAO_INSTITUIDAS = new Set(
  DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS.flatMap((d) => [chave(d.rotulo), chave(d.valor), 'financeiro', 'financas']),
)

/** Separa uma linha respeitando aspas, como um CSV de verdade. */
function separarCampos(linha, delimitador) {
  const campos = []
  let atual = ''
  let entreAspas = false

  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i]
    if (entreAspas) {
      if (c === '"') {
        if (linha[i + 1] === '"') {
          atual += '"'
          i += 1
        } else entreAspas = false
      } else atual += c
    } else if (c === '"') {
      entreAspas = true
    } else if (c === delimitador) {
      campos.push(atual)
      atual = ''
    } else {
      atual += c
    }
  }
  campos.push(atual)
  return campos.map((c) => c.trim())
}

/** Tabulação primeiro: é o que sai ao copiar de uma planilha. */
export function detectarDelimitador(texto) {
  const primeiras = String(texto || '')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 5)
  if (primeiras.length === 0) return '\t'

  const contar = (d) =>
    primeiras.reduce((total, linha) => total + (linha.split(d).length - 1), 0)

  const candidatos = [
    ['\t', contar('\t')],
    [';', contar(';')],
    [',', contar(',')],
  ].filter(([, n]) => n > 0)

  if (candidatos.length === 0) return '\t'
  candidatos.sort((a, b) => b[1] - a[1])
  return candidatos[0][0]
}

/** Divide o texto em cabeçalho e linhas, descartando linhas vazias. */
export function analisarPlanilha(texto) {
  const delimitador = detectarDelimitador(texto)
  const linhas = String(texto || '')
    .split(/\r?\n/)
    .map((l) => separarCampos(l, delimitador))
    .filter((campos) => campos.some((c) => c !== ''))

  if (linhas.length === 0) return { delimitador, cabecalho: [], linhas: [] }

  // Planilha exportada costuma trazer título e linhas em branco antes do
  // cabeçalho real: o cabeçalho é a primeira linha com duas ou mais colunas.
  let indiceCabecalho = linhas.findIndex((l) => l.filter((c) => c !== '').length >= 2)
  if (indiceCabecalho === -1) indiceCabecalho = 0

  return {
    delimitador,
    cabecalho: linhas[indiceCabecalho],
    linhas: linhas.slice(indiceCabecalho + 1),
  }
}

/** Casa cada coluna do cabeçalho com um campo do quadro. */
export function mapearColunas(cabecalho, slugQuadro) {
  const quadro = obterQuadro(slugQuadro)
  if (!quadro) return { mapa: {}, ignoradas: [...cabecalho] }

  const aliases = { ...ALIASES.comum, ...(ALIASES[slugQuadro] || {}) }

  const mapa = {}
  const ignoradas = []
  const usados = new Set()

  cabecalho.forEach((nome, indice) => {
    const alvo = chave(nome)
    if (!alvo) return

    let campo = null

    // 1. Nome igual ao rótulo de um campo do quadro.
    for (const coluna of camposDoQuadro(quadro)) {
      if (chave(coluna.rotulo) === alvo) {
        campo = coluna.campo
        break
      }
    }

    // 2. Lista de apelidos conhecidos.
    if (!campo) {
      for (const [destino, nomes] of Object.entries(aliases)) {
        if (!nomes.some((n) => chave(n) === alvo)) continue
        campo = destino
        break
      }
    }

    if (!campo || usados.has(campo)) {
      ignoradas.push(nome)
      return
    }
    usados.add(campo)
    mapa[campo] = indice
  })

  return { mapa, ignoradas }
}

function traduzirDiretoria(valor) {
  const alvo = chave(valor)
  if (!alvo) return { valor: null }
  if (CHAVES_NAO_INSTITUIDAS.has(alvo)) {
    return {
      valor: null,
      aviso:
        `"${valor}" não é uma diretoria instituída. O Art. 33º VII e o Art. 44º preveem a ` +
        'Diretoria Financeira apenas "quando instituída"; enquanto isso, use Presidência e ' +
        'registre o responsável designado (Art. 33º §2º).',
    }
  }
  const encontrado = DIRETORIA_POR_CHAVE.get(alvo)
  if (encontrado) return { valor: encontrado }
  return { valor: null, aviso: `Diretoria "${valor}" não reconhecida; ficou em branco.` }
}

function traduzirDeLista(valor, opcoes, rotuloCampo) {
  const alvo = chave(valor)
  if (!alvo) return { valor: null }
  const encontrado = opcoes.find((o) => chave(o.valor) === alvo || chave(o.rotulo) === alvo)
  if (encontrado) return { valor: encontrado.valor }
  return { valor: null, aviso: `${rotuloCampo} "${valor}" não reconhecido; ficou em branco.` }
}

function traduzirData(valor) {
  const bruto = String(valor || '').trim()
  if (!bruto) return { valor: null }
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return { valor: bruto }

  const br = bruto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (br) {
    const ano = br[3].length === 2 ? `20${br[3]}` : br[3]
    return { valor: `${ano}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` }
  }
  return { valor: null, aviso: `Data "${bruto}" não reconhecida; use AAAA-MM-DD ou DD/MM/AAAA.` }
}

/** Encontra o grupo do quadro que corresponde ao valor da planilha. */
function traduzirGrupo(valor, quadro) {
  const alvo = chave(valor)
  if (!alvo) return { nome: null }

  const exato = (quadro.grupos || []).find((g) => chave(g.nome) === alvo)
  if (exato) return { nome: exato.nome }

  // "Fundador" casa com "Membros Fundadores"; "Membro Efetivo" com "Membros Efetivos".
  const parcial = (quadro.grupos || []).find((g) => {
    const nome = chave(g.nome)
    return nome.includes(alvo) || alvo.includes(nome.replace(/^membros? /, ''))
  })
  if (parcial) return { nome: parcial.nome }

  return { nome: null, aviso: `Grupo "${valor}" não existe neste quadro; o item fica sem grupo.` }
}

/** Verificações estatutárias específicas de cada quadro. */
function verificarEstatuto(slugQuadro, item) {
  const avisos = []

  if (slugQuadro === 'membros') {
    const curso = String(item.dados?.curso || '')
    const grupo = String(item.__grupo || '')
    if (curso && chave(grupo).includes('efetiv') && !chave(curso).includes('administracao')) {
      avisos.push(
        `Art. 13º: Membro Efetivo é exclusivamente estudante da Graduação em Administração, e o ` +
          `curso informado é "${curso}". Confira a categoria, ou avalie o Art. 117º §1º, que ` +
          'preserva quem já era membro antes da nova redação.',
      )
    }
  }

  return avisos
}

/**
 * Prepara a importação: devolve as linhas já traduzidas, com os avisos de cada
 * uma, para conferência antes de gravar.
 */
export function prepararImportacao(slugQuadro, texto) {
  const quadro = obterQuadro(slugQuadro)
  if (!quadro) {
    return { ok: false, erro: 'Quadro inexistente.' }
  }

  const { cabecalho, linhas, delimitador } = analisarPlanilha(texto)
  if (cabecalho.length === 0) {
    return { ok: false, erro: 'Nada a importar: cole o conteúdo da planilha, com a linha de títulos.' }
  }

  const { mapa, ignoradas } = mapearColunas(cabecalho, slugQuadro)

  if (mapa.titulo === undefined) {
    return {
      ok: false,
      erro:
        'Não encontrei a coluna do nome. A planilha precisa de uma coluna chamada ' +
        `"Nome completo", "Nome" ou "${quadro.rotuloItem || 'Título'}".`,
      colunasLidas: cabecalho,
    }
  }

  if (linhas.length > LIMITE_LINHAS) {
    return {
      ok: false,
      erro: `A planilha tem ${linhas.length} linhas e o limite é ${LIMITE_LINHAS} por importação.`,
    }
  }

  const camposConfig = new Map(camposDoQuadro(quadro).map((c) => [c.campo, c]))
  const itens = []

  linhas.forEach((linha, indice) => {
    const ler = (campo) => {
      const i = mapa[campo]
      return i === undefined ? '' : (linha[i] || '').trim()
    }

    const titulo = ler('titulo')
    if (!titulo) return // linha sem nome é ruído de planilha, não erro

    const item = { titulo, dados: {} }
    const avisos = []

    for (const [campo, indiceColuna] of Object.entries(mapa)) {
      if (campo === 'titulo') continue
      const bruto = (linha[indiceColuna] || '').trim()
      if (!bruto) continue

      if (campo === '__grupo') {
        const { nome, aviso } = traduzirGrupo(bruto, quadro)
        item.__grupo = nome || bruto
        if (aviso) avisos.push(aviso)
        continue
      }

      if (campo === 'diretoria') {
        const { valor, aviso } = traduzirDiretoria(bruto)
        if (valor) item.diretoria = valor
        if (aviso) avisos.push(aviso)
        continue
      }

      if (campo === 'status') {
        const { valor, aviso } = traduzirDeLista(bruto, quadro.statusOpcoes || [], 'Status')
        if (valor) item.status = valor
        if (aviso) avisos.push(aviso)
        continue
      }

      if (campo === 'prioridade') {
        const { valor, aviso } = traduzirDeLista(bruto, PRIORIDADES, 'Prioridade')
        if (valor) item.prioridade = valor
        if (aviso) avisos.push(aviso)
        continue
      }

      if (campo === 'confidencialidade') {
        const { valor, aviso } = traduzirDeLista(bruto, CONFIDENCIALIDADE, 'Confidencialidade')
        if (valor) item.confidencialidade = valor
        if (aviso) avisos.push(aviso)
        continue
      }

      const config = camposConfig.get(campo)

      if (campo === 'prazo' || config?.tipo === 'data') {
        const { valor, aviso } = traduzirData(bruto)
        if (aviso) avisos.push(aviso)
        if (!valor) continue
        if (campo.startsWith('dados.')) item.dados[campo.slice(6)] = valor
        else item[campo] = valor
        continue
      }

      if (config?.tipo === 'select') {
        const { valor, aviso } = traduzirDeLista(bruto, config.opcoes || [], config.rotulo)
        if (aviso) avisos.push(aviso)
        if (!valor) continue
        if (campo.startsWith('dados.')) item.dados[campo.slice(6)] = valor
        else item[campo] = valor
        continue
      }

      if (campo.startsWith('dados.')) item.dados[campo.slice(6)] = bruto
      else item[campo] = bruto
    }

    avisos.push(...verificarEstatuto(slugQuadro, item))

    itens.push({ linha: indice + 1, item, avisos })
  })

  const colunasReconhecidas = Object.entries(mapa).map(([campo, indice]) => ({
    campo,
    coluna: cabecalho[indice],
    rotulo:
      campo === '__grupo'
        ? 'Grupo'
        : campo === 'titulo'
          ? quadro.rotuloItem || 'Título'
          : camposConfig.get(campo)?.rotulo || campo,
  }))

  return {
    ok: true,
    delimitador: delimitador === '\t' ? 'tabulação' : delimitador,
    colunasReconhecidas,
    colunasIgnoradas: ignoradas,
    itens,
    total: itens.length,
    comAviso: itens.filter((i) => i.avisos.length > 0).length,
  }
}

/**
 * Papel de acesso sugerido pelo cargo informado na planilha. A Presidência
 * confirma antes de qualquer autorização: nada aqui concede acesso sozinho.
 */
export function papelSugeridoPeloCargo(cargo) {
  const alvo = chave(cargo)
  if (!alvo) return 'colaborador'
  if (alvo.includes('presidente') && alvo.includes('vice')) return 'vice_presidencia'
  if (alvo.includes('vice')) return 'vice_presidencia'
  if (alvo.includes('presidente') || alvo.includes('presidencia')) return 'presidencia'
  if (alvo.includes('diretor') || alvo.includes('diretora')) return 'diretor'
  if (alvo.includes('trainee')) return 'leitor'
  return 'colaborador'
}
