/**
 * Configuração institucional dos quadros.
 *
 * Fonte de verdade: Estatuto Oficial da Saint Paul Finance, versão de
 * setembro de 2026 (121 artigos, 26 capítulos). Toda diretoria, competência,
 * quórum e etapa declarada aqui possui artigo de fundamentação.
 *
 * Nota estatutária sobre a Diretoria Financeira: o Art. 33º VII e o Art. 44º
 * a preveem apenas "quando instituída". Enquanto não instituída, ela NÃO é
 * uma diretoria atribuível no sistema; as responsabilidades financeiras ficam
 * com a Presidência e com responsável especificamente designado, na forma do
 * Art. 33º §2º e do Art. 44º parágrafo único.
 */

// ---------------------------------------------------------------------------
// Diretorias e papéis
// ---------------------------------------------------------------------------

export const DIRETORIAS = [
  { valor: 'presidencia', rotulo: 'Presidência', artigo: 'Art. 38º', cor: 'pinho' },
  { valor: 'vice_presidencia', rotulo: 'Vice-Presidência', artigo: 'Art. 39º', cor: 'verde' },
  { valor: 'formacao', rotulo: 'Formação', artigo: 'Art. 40º', cor: 'azul' },
  { valor: 'institucional', rotulo: 'Institucional', artigo: 'Art. 42º', cor: 'roxo' },
  { valor: 'eventos', rotulo: 'Eventos', artigo: 'Art. 41º', cor: 'ambar' },
  { valor: 'comunicacao', rotulo: 'Comunicação', artigo: 'Art. 43º', cor: 'cinza' },
]

/**
 * Diretoria prevista no Estatuto mas não instituída pela Liga. Registrada
 * para consulta e transparência; nunca oferecida como responsável de item.
 */
export const DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS = [
  {
    valor: 'financeira',
    rotulo: 'Diretoria Financeira',
    artigo: 'Art. 33º VII',
    situacao: 'Prevista, não instituída',
    observacao:
      'Art. 33º VII e Art. 44º preveem a Diretoria Financeira "quando instituída". ' +
      'Enquanto não instituída, as responsabilidades financeiras são atribuídas pela ' +
      'Presidência a responsável específico (Art. 33º §2º e Art. 44º parágrafo único). ' +
      'Por isso este sistema não permite atribuir itens a uma Diretoria Financeira.',
  },
]

export const PAPEIS = [
  {
    valor: 'administrador',
    rotulo: 'Administrador do sistema',
    descricao: 'Configuração técnica, gestão de acessos e migrações.',
    nivel: 100,
  },
  {
    valor: 'presidencia',
    rotulo: 'Presidência',
    descricao: 'Visão ampla, aprovação e decisão final sobre matérias estratégicas.',
    artigo: 'Art. 38º',
    nivel: 90,
  },
  {
    valor: 'vice_presidencia',
    rotulo: 'Vice-Presidência',
    descricao: 'Cadência de execução, indicadores, riscos e blockers transversais.',
    artigo: 'Art. 39º',
    nivel: 80,
  },
  {
    valor: 'diretor',
    rotulo: 'Diretor',
    descricao: 'Gestão dos quadros e itens da própria diretoria.',
    artigo: 'Art. 45º §3º',
    nivel: 60,
  },
  {
    valor: 'colaborador',
    rotulo: 'Colaborador',
    descricao: 'Acesso e edição dos itens atribuídos ou da própria diretoria.',
    nivel: 40,
  },
  {
    valor: 'leitor',
    rotulo: 'Leitor',
    descricao: 'Consulta limitada, sem mutações.',
    nivel: 20,
  },
]

export const NIVEL_PAPEL = Object.fromEntries(PAPEIS.map((p) => [p.valor, p.nivel]))

// ---------------------------------------------------------------------------
// Vocabulários comuns
// ---------------------------------------------------------------------------

export const CONFIDENCIALIDADE = [
  { valor: 'publico', rotulo: 'Público', cor: 'cinza', nivel: 1 },
  { valor: 'interno', rotulo: 'Interno', cor: 'azul', nivel: 2 },
  { valor: 'confidencial', rotulo: 'Confidencial', cor: 'ambar', nivel: 3 },
  { valor: 'restrito', rotulo: 'Restrito', cor: 'vermelho', nivel: 4 },
]

export const NIVEL_CONFIDENCIALIDADE = Object.fromEntries(
  CONFIDENCIALIDADE.map((c) => [c.valor, c.nivel]),
)

export const PRIORIDADES = [
  { valor: 'baixa', rotulo: 'Baixa', cor: 'cinza' },
  { valor: 'media', rotulo: 'Média', cor: 'azul' },
  { valor: 'alta', rotulo: 'Alta', cor: 'ambar' },
  { valor: 'critica', rotulo: 'Crítica', cor: 'vermelho' },
]

export const INSTANCIAS_DECISORIAS = [
  { valor: 'presidencia', rotulo: 'Presidência', artigo: 'Art. 38º, Art. 45º §1º' },
  { valor: 'vice_presidencia', rotulo: 'Vice-Presidência', artigo: 'Art. 39º, Art. 45º §2º' },
  { valor: 'diretoria_executiva', rotulo: 'Diretoria Executiva', artigo: 'Art. 37º, Art. 65º' },
  { valor: 'diretoria_funcional', rotulo: 'Diretoria Funcional', artigo: 'Art. 45º §3º' },
  { valor: 'assembleia', rotulo: 'Assembleia Geral', artigo: 'Art. 30º, Art. 66º' },
]

/** Quóruns literais do Estatuto, usados na Consulta ao Estatuto e nas Deliberações. */
export const QUORUNS = [
  {
    materia: 'Matéria colegiada ordinária da Diretoria Executiva',
    instancia: 'Diretoria Executiva',
    quorum: 'Maioria simples dos integrantes aptos a votar',
    artigo: 'Art. 65º',
    observacao: 'Empate resolvido por voto de qualidade do Presidente, salvo conflito de interesse (Art. 65º §1º).',
  },
  {
    materia: 'Criação, fusão, suspensão ou extinção de Diretoria Funcional',
    instancia: 'Diretoria Executiva',
    quorum: 'Maioria simples, sob proposta da Presidência',
    artigo: 'Art. 34º §1º',
  },
  {
    materia: 'Instalação da Assembleia Geral',
    instancia: 'Assembleia Geral',
    quorum: 'Maioria absoluta dos Membros Efetivos aptos em primeira convocação; qualquer número em segunda',
    artigo: 'Art. 66º',
    observacao: 'A segunda convocação não reduz quórum de aprovação qualificado (Art. 66º parágrafo único).',
  },
  {
    materia: 'Indicação final de sucessor da Presidência',
    instancia: 'Diretoria Executiva',
    quorum: 'Dois terços dos integrantes aptos, excluídos candidatos e conflitados',
    artigo: 'Art. 69º V',
  },
  {
    materia: 'Ratificação da sucessão da Presidência',
    instancia: 'Assembleia Geral',
    quorum: 'Maioria simples, observado o quórum de instalação',
    artigo: 'Art. 69º VI, Art. 30º IV',
  },
  {
    materia: 'Perda antecipada do cargo de Presidente',
    instancia: 'Diretoria Executiva e Assembleia Geral',
    quorum:
      'Dois terços da Diretoria Executiva apta e ratificação por dois terços dos Membros Efetivos presentes, com presença mínima de maioria absoluta',
    artigo: 'Art. 84º §3º',
  },
  {
    materia: 'Alteração estatutária',
    instancia: 'Assembleia Geral',
    quorum: 'Dois terços de todos os Membros Efetivos aptos a votar, e não apenas dos presentes',
    artigo: 'Art. 112º IV e parágrafo único',
  },
  {
    materia: 'Dissolução da Liga',
    instancia: 'Assembleia Geral',
    quorum: 'Três quartos dos Membros Efetivos aptos a votar',
    artigo: 'Art. 114º',
  },
  {
    materia: 'Reunião extraordinária por requerimento dos membros',
    instancia: 'Membros Efetivos',
    quorum: 'Requerimento de pelo menos um terço dos Membros Efetivos em situação regular',
    artigo: 'Art. 64º',
  },
  {
    materia: 'Proposta de alteração estatutária pelos membros',
    instancia: 'Membros Efetivos',
    quorum: 'Pelo menos um terço dos Membros Efetivos aptos a votar',
    artigo: 'Art. 111º III',
  },
]

/** Tabela "quem decide o quê" (Art. 45º e Art. 120º). */
export const DIREITOS_DE_DECISAO = [
  {
    materia: 'Direção estratégica, prioridades gerais e representação institucional',
    decide: 'Presidência',
    artigo: 'Art. 38º I–III, Art. 45º §1º',
  },
  {
    materia: 'Arbitragem de conflito entre Diretorias Funcionais',
    decide: 'Presidência',
    artigo: 'Art. 38º IV',
  },
  {
    materia: 'Reorganização ordinária de responsabilidades e movimentação entre diretorias',
    decide: 'Presidência, com consulta prévia aos impactados',
    artigo: 'Art. 34º §2º e §3º',
  },
  {
    materia: 'Decisão urgente para proteger continuidade, reputação ou integridade',
    decide: 'Presidência, com submissão posterior ao colegiado',
    artigo: 'Art. 38º IX, Art. 120º §1º',
  },
  {
    materia: 'Cadência, rituais, indicadores, CTAs e acompanhamento transversal',
    decide: 'Vice-Presidência',
    artigo: 'Art. 39º II e IV, Art. 45º §2º',
  },
  {
    materia: 'Execução das matérias do próprio escopo',
    decide: 'Cada Diretoria Funcional',
    artigo: 'Art. 45º §3º, Art. 37º parágrafo único',
  },
  {
    materia: 'Planejamento institucional, orçamento e compromissos financeiros relevantes',
    decide: 'Diretoria Executiva, colegiadamente',
    artigo: 'Art. 37º I e II',
  },
  {
    materia: 'Criação, fusão, suspensão ou extinção de Diretoria Funcional',
    decide: 'Diretoria Executiva, por maioria simples',
    artigo: 'Art. 37º III, Art. 34º §1º',
  },
  {
    materia: 'Parceria com compromisso institucional, financeiro ou reputacional relevante',
    decide: 'Diretoria Executiva',
    artigo: 'Art. 37º V',
  },
  {
    materia: 'Admissão de Trainee como Membro Efetivo',
    decide: 'Diretoria Executiva, na avaliação final',
    artigo: 'Art. 22º',
  },
  {
    materia: 'Condução operacional do processo seletivo',
    decide: 'Diretoria Institucional, com Presidência e Vice-Presidência',
    artigo: 'Art. 24º, Art. 42º IV',
  },
  {
    materia: 'Seleção para challenge externo com vagas limitadas',
    decide: 'Diretoria de Formação, com Vice-Presidência e Institucional',
    artigo: 'Art. 59º',
  },
  {
    materia: 'Integração excepcional de não membros a equipe de competição',
    decide: 'Diretoria Executiva',
    artigo: 'Art. 61º',
  },
  {
    materia: 'Alteração deste Estatuto e dissolução da Liga',
    decide: 'Assembleia Geral, por quórum qualificado',
    artigo: 'Art. 30º I e II, Art. 112º, Art. 114º',
  },
  {
    materia: 'Medida disciplinar, advertência, suspensão ou desligamento',
    decide: 'Instância competente, com contraditório mínimo',
    artigo: 'Art. 82º, Art. 83º',
  },
  {
    materia: 'Responsabilidades financeiras enquanto não instituída a Diretoria Financeira',
    decide: 'Presidência, mediante designação de responsável específico',
    artigo: 'Art. 33º §2º, Art. 44º parágrafo único',
  },
  {
    materia: 'Caso omisso de escopo claramente funcional',
    decide: 'Responsável da Diretoria Funcional',
    artigo: 'Art. 120º I',
  },
  {
    materia: 'Caso omisso estratégico, de arbitragem ou urgente',
    decide: 'Presidência',
    artigo: 'Art. 120º II',
  },
  {
    materia: 'Caso omisso de impacto geral, estrutural, financeiro ou disciplinar',
    decide: 'Diretoria Executiva',
    artigo: 'Art. 120º III',
  },
]

// ---------------------------------------------------------------------------
// Status padrão de execução
// ---------------------------------------------------------------------------

const STATUS_EXECUCAO = [
  { valor: 'nao_iniciado', rotulo: 'Não iniciado', cor: 'cinza' },
  { valor: 'em_andamento', rotulo: 'Em andamento', cor: 'azul' },
  { valor: 'aguardando', rotulo: 'Aguardando terceiro', cor: 'ambar' },
  { valor: 'bloqueado', rotulo: 'Bloqueado', cor: 'vermelho' },
  { valor: 'concluido', rotulo: 'Concluído', cor: 'verde' },
  { valor: 'cancelado', rotulo: 'Cancelado', cor: 'cinza' },
]

// Colunas presentes em todo quadro operacional.
const COLUNAS_BASE = [
  { campo: 'responsavel', rotulo: 'Responsável', tipo: 'pessoa' },
  { campo: 'diretoria', rotulo: 'Diretoria', tipo: 'diretoria' },
  { campo: 'status', rotulo: 'Status', tipo: 'status' },
  { campo: 'prazo', rotulo: 'Prazo', tipo: 'data' },
]

// ---------------------------------------------------------------------------
// Quadros
// ---------------------------------------------------------------------------

export const QUADROS = [
  // ---------------------------------------------------------------- Governança
  {
    slug: 'deliberacoes',
    nome: 'Deliberações & Atas',
    secao: 'Governança',
    tipo: 'quadro',
    descricao:
      'Registro das deliberações, atas, pautas, quóruns e execução das decisões da Liga.',
    artigos: ['Art. 37º', 'Art. 63º', 'Art. 64º', 'Art. 65º', 'Art. 66º', 'Art. 67º'],
    notaEstatutaria:
      'O Art. 67º exige que reuniões e deliberações relevantes sejam registradas em ata com data, participantes, pauta, decisões, responsáveis e prazos. O Art. 63º §2º determina que a reunião priorize desvios, riscos, blockers, decisões e próximos passos.',
    statusOpcoes: [
      { valor: 'em_pauta', rotulo: 'Em pauta', cor: 'cinza' },
      { valor: 'em_deliberacao', rotulo: 'Em deliberação', cor: 'azul' },
      { valor: 'aprovada', rotulo: 'Aprovada', cor: 'verde' },
      { valor: 'rejeitada', rotulo: 'Rejeitada', cor: 'vermelho' },
      { valor: 'em_execucao', rotulo: 'Em execução', cor: 'ambar' },
      { valor: 'executada', rotulo: 'Executada', cor: 'verde' },
      { valor: 'sobrestada', rotulo: 'Sobrestada', cor: 'roxo' },
    ],
    grupos: [
      { nome: 'Assembleia Geral', cor: 'pinho' },
      { nome: 'Diretoria Executiva', cor: 'verde' },
      { nome: 'Presidência', cor: 'roxo' },
      { nome: 'Vice-Presidência', cor: 'azul' },
      { nome: 'Diretoria Funcional', cor: 'cinza' },
      { nome: 'Alteração estatutária', cor: 'ambar' },
    ],
    colunas: [
      { campo: 'dados.instancia', rotulo: 'Instância', tipo: 'select', opcoes: INSTANCIAS_DECISORIAS },
      { campo: 'dados.relator', rotulo: 'Relator', tipo: 'pessoa' },
      { campo: 'status', rotulo: 'Status', tipo: 'status' },
      { campo: 'dados.data_reuniao', rotulo: 'Data da reunião', tipo: 'data' },
      { campo: 'dados.quorum', rotulo: 'Quórum aplicável', tipo: 'texto' },
      { campo: 'dados.votacao', rotulo: 'Resultado da votação', tipo: 'texto' },
      { campo: 'responsavel', rotulo: 'Executa', tipo: 'pessoa' },
      { campo: 'prazo', rotulo: 'Prazo', tipo: 'data' },
    ],
    campos: [
      { campo: 'dados.pauta', rotulo: 'Pauta', tipo: 'textolongo' },
      { campo: 'dados.decisao', rotulo: 'Decisão', tipo: 'textolongo' },
      {
        campo: 'dados.impedimento',
        rotulo: 'Impedimento por conflito de interesse',
        tipo: 'textolongo',
        ajuda: 'Art. 45º §8º, Art. 60º e Art. 65º §3º: o conflitado declara e pode ser impedido de votar.',
      },
      { campo: 'dados.participantes', rotulo: 'Participantes', tipo: 'textolongo', ajuda: 'Art. 67º' },
      { campo: 'dados.ata_origem', rotulo: 'Ata ou documento de origem', tipo: 'texto' },
    ],
  },

  {
    slug: 'operacao',
    nome: 'Operação',
    secao: 'Governança',
    tipo: 'quadro',
    descricao:
      'Execução diária por diretoria e competência estatutária, com owner, prazo, risco, blocker e próximo passo.',
    artigos: ['Art. 39º', 'Art. 45º', 'Art. 63º'],
    notaEstatutaria:
      'Os grupos seguem as Diretorias Funcionais do Art. 33º. Não existe grupo de Diretoria Financeira: o Art. 33º VII a prevê apenas "quando instituída", e o Art. 33º §2º atribui as responsabilidades financeiras a responsável designado pela Presidência. Por isso o grupo se chama "Orçamento e prestação de contas".',
    statusOpcoes: STATUS_EXECUCAO,
    grupos: [
      { nome: 'Presidência', cor: 'pinho', artigo: 'Art. 38º' },
      { nome: 'Vice-Presidência', cor: 'verde', artigo: 'Art. 39º' },
      { nome: 'Formação', cor: 'azul', artigo: 'Art. 40º' },
      { nome: 'Institucional', cor: 'roxo', artigo: 'Art. 42º' },
      { nome: 'Eventos', cor: 'ambar', artigo: 'Art. 41º' },
      { nome: 'Comunicação', cor: 'cinza', artigo: 'Art. 43º' },
      {
        nome: 'Orçamento e prestação de contas',
        cor: 'vermelho',
        artigo: 'Art. 33º §2º, Art. 44º parágrafo único, Art. 88º',
      },
      { nome: 'Extensão e impacto social', cor: 'verde', artigo: 'Cap. XXII, Art. 105º' },
    ],
    colunas: [
      ...COLUNAS_BASE,
      { campo: 'prioridade', rotulo: 'Prioridade', tipo: 'prioridade' },
      { campo: 'co_responsavel', rotulo: 'Co-responsável', tipo: 'pessoa' },
      { campo: 'risco', rotulo: 'Risco', tipo: 'texto' },
      { campo: 'blocker', rotulo: 'Blocker', tipo: 'texto' },
      { campo: 'proximo_passo', rotulo: 'Próximo passo', tipo: 'texto' },
    ],
    campos: [{ campo: 'origem', rotulo: 'Origem', tipo: 'texto' }],
  },

  // ----------------------------------------------------------- Relacionamento
  {
    slug: 'crm',
    nome: 'CRM Institucional',
    secao: 'Relacionamento',
    tipo: 'quadro',
    descricao:
      'Base institucional de organizações e contatos, com origem, histórico, responsável e próximo passo.',
    artigos: ['Art. 42º II', 'Art. 42º V', 'Art. 42º parágrafo único', 'Art. 104º', 'Art. 97º'],
    notaEstatutaria:
      'O Art. 42º II obriga o registro de contato, origem, histórico, status, responsável e próximo passo. O Art. 42º parágrafo único determina que relacionamentos desenvolvidos em nome da Liga pertencem institucionalmente a ela e devem ser registrados nos sistemas oficiais. O Art. 97º §1º restringe o acesso a quem tenha necessidade funcional legítima.',
    statusOpcoes: [
      { valor: 'a_contatar', rotulo: 'A contatar', cor: 'cinza' },
      { valor: 'contato_iniciado', rotulo: 'Contato iniciado', cor: 'azul' },
      { valor: 'relacionamento_ativo', rotulo: 'Relacionamento ativo', cor: 'verde' },
      { valor: 'em_follow_up', rotulo: 'Em follow-up', cor: 'ambar' },
      { valor: 'sem_resposta', rotulo: 'Sem resposta', cor: 'roxo' },
      { valor: 'inativo', rotulo: 'Inativo', cor: 'vermelho' },
    ],
    grupos: [
      { nome: 'Bancos e assets', cor: 'pinho' },
      { nome: 'Boutiques e consultorias', cor: 'verde' },
      { nome: 'Empresas', cor: 'azul' },
      { nome: 'Academia e alumni', cor: 'roxo', artigo: 'Art. 15º' },
      { nome: 'Conselheiros, mentores e patronos', cor: 'ambar', artigo: 'Art. 17º' },
      { nome: 'Outros contatos', cor: 'cinza' },
    ],
    rotuloItem: 'Contato',
    colunas: [
      { campo: 'dados.organizacao', rotulo: 'Organização', tipo: 'texto' },
      { campo: 'dados.cargo', rotulo: 'Cargo', tipo: 'texto' },
      { campo: 'status', rotulo: 'Etapa do relacionamento', tipo: 'status' },
      { campo: 'responsavel', rotulo: 'Responsável', tipo: 'pessoa' },
      { campo: 'dados.ultimo_contato', rotulo: 'Último contato', tipo: 'data' },
      { campo: 'prazo', rotulo: 'Próximo contato', tipo: 'data' },
      { campo: 'dados.potencial', rotulo: 'Potencial', tipo: 'select', opcoes: [
        { valor: 'exploratorio', rotulo: 'Exploratório' },
        { valor: 'moderado', rotulo: 'Moderado' },
        { valor: 'alto', rotulo: 'Alto' },
        { valor: 'estrategico', rotulo: 'Estratégico' },
      ] },
      { campo: 'confidencialidade', rotulo: 'Confidencialidade', tipo: 'confidencialidade' },
    ],
    campos: [
      { campo: 'dados.email', rotulo: 'E-mail', tipo: 'email' },
      { campo: 'dados.telefone', rotulo: 'Telefone', tipo: 'telefone' },
      { campo: 'dados.linkedin', rotulo: 'LinkedIn', tipo: 'url' },
      { campo: 'origem', rotulo: 'Origem', tipo: 'texto' },
      { campo: 'proximo_passo', rotulo: 'Próximo passo', tipo: 'texto' },
      { campo: 'dados.contrapartida', rotulo: 'Contrapartida', tipo: 'textolongo' },
      { campo: 'dados.observacoes', rotulo: 'Observações', tipo: 'textolongo' },
    ],
  },

  {
    slug: 'parcerias',
    nome: 'Pipeline de Parcerias',
    secao: 'Relacionamento',
    tipo: 'quadro',
    descricao:
      'Pipeline de parcerias, patrocínios, mentorias, visitas técnicas e oportunidades externas.',
    artigos: ['Art. 101º', 'Art. 102º', 'Art. 103º', 'Art. 104º', 'Art. 37º V', 'Art. 89º'],
    notaEstatutaria:
      'O Art. 104º atribui a organização e continuidade das parcerias à Diretoria Institucional; §1º chama a Presidência para relações estratégicas, §2º a Diretoria de Eventos para execução, §3º o responsável financeiro quando houver recurso, §4º a Comunicação quando houver divulgação ou uso de marca. O Art. 37º V submete à Diretoria Executiva a parceria com compromisso relevante. O Art. 103º veda parceria que comprometa independência acadêmica.',
    statusOpcoes: [
      { valor: 'mapeada', rotulo: 'Mapeada', cor: 'cinza' },
      { valor: 'primeiro_contato', rotulo: 'Primeiro contato', cor: 'cinza' },
      { valor: 'conversa_iniciada', rotulo: 'Conversa iniciada', cor: 'azul' },
      { valor: 'proposta', rotulo: 'Proposta', cor: 'azul' },
      { valor: 'em_validacao', rotulo: 'Em validação', cor: 'ambar' },
      { valor: 'aprovada', rotulo: 'Aprovada', cor: 'verde' },
      { valor: 'ativa', rotulo: 'Ativa', cor: 'verde' },
      { valor: 'encerrada', rotulo: 'Encerrada', cor: 'roxo' },
      { valor: 'declinada', rotulo: 'Declinada', cor: 'vermelho' },
    ],
    grupos: [
      { nome: 'Mentorias e office hours', cor: 'azul', artigo: 'Art. 102º' },
      { nome: 'Palestras e painéis', cor: 'ambar', artigo: 'Art. 102º' },
      { nome: 'Visitas técnicas', cor: 'verde', artigo: 'Art. 102º' },
      { nome: 'Patrocínios e apoios', cor: 'vermelho', artigo: 'Art. 85º, Art. 89º' },
      { nome: 'Challenges e competições', cor: 'roxo', artigo: 'Art. 55º' },
      { nome: 'Projetos especiais', cor: 'cinza', artigo: 'Art. 102º' },
    ],
    rotuloItem: 'Parceria',
    colunas: [
      { campo: 'dados.organizacao', rotulo: 'Organização', tipo: 'texto' },
      { campo: 'status', rotulo: 'Etapa', tipo: 'status' },
      { campo: 'responsavel', rotulo: 'Responsável', tipo: 'pessoa' },
      { campo: 'co_responsavel', rotulo: 'Co-responsável', tipo: 'pessoa' },
      { campo: 'prazo', rotulo: 'Próximo passo em', tipo: 'data' },
      { campo: 'dados.envolve_recurso', rotulo: 'Envolve recurso', tipo: 'booleano', ajuda: 'Art. 104º §3º' },
      { campo: 'dados.validacao_institucional', rotulo: 'Validação institucional', tipo: 'select', opcoes: [
        { valor: 'nao_aplicavel', rotulo: 'Não aplicável' },
        { valor: 'pendente', rotulo: 'Pendente' },
        { valor: 'obtida', rotulo: 'Obtida' },
      ], ajuda: 'Art. 91º' },
      { campo: 'prioridade', rotulo: 'Prioridade', tipo: 'prioridade' },
    ],
    campos: [
      { campo: 'dados.contrapartida', rotulo: 'Contrapartida', tipo: 'textolongo' },
      { campo: 'proximo_passo', rotulo: 'Próximo passo', tipo: 'texto' },
      { campo: 'risco', rotulo: 'Risco', tipo: 'texto' },
      { campo: 'blocker', rotulo: 'Blocker', tipo: 'texto' },
      { campo: 'origem', rotulo: 'Origem', tipo: 'texto' },
    ],
  },

  // ------------------------------------------------------------------ Pessoas
  {
    slug: 'membros',
    nome: 'Membros & Trainees',
    secao: 'Pessoas',
    tipo: 'quadro',
    descricao:
      'Quadro de membros por categoria estatutária, com diretoria, função, situação e histórico preservado.',
    artigos: ['Art. 11º', 'Art. 12º', 'Art. 13º', 'Art. 14º', 'Art. 15º', 'Art. 16º', 'Art. 17º', 'Art. 18º'],
    notaEstatutaria:
      'As categorias seguem exatamente o Art. 11º. O Art. 13º restringe Membro Efetivo a estudantes matriculados na Graduação em Administração da Escola de Negócios Saint Paul. O Art. 72º parágrafo único e o Art. 42º VIII exigem preservação da memória institucional: registros de pessoas desligadas não são apagados.',
    statusOpcoes: [
      { valor: 'ativo', rotulo: 'Ativo', cor: 'verde' },
      { valor: 'em_formacao', rotulo: 'Em formação', cor: 'azul' },
      { valor: 'afastado', rotulo: 'Afastado', cor: 'ambar' },
      { valor: 'desligado', rotulo: 'Desligado', cor: 'cinza' },
      { valor: 'alumni', rotulo: 'Alumni', cor: 'roxo' },
    ],
    grupos: [
      { nome: 'Membros Fundadores', cor: 'pinho', artigo: 'Art. 12º' },
      { nome: 'Membros Efetivos', cor: 'verde', artigo: 'Art. 13º' },
      { nome: 'Trainees', cor: 'azul', artigo: 'Art. 14º' },
      { nome: 'Membros Alumni', cor: 'roxo', artigo: 'Art. 15º' },
      { nome: 'Membros Honorários', cor: 'ambar', artigo: 'Art. 16º' },
      { nome: 'Conselheiros, Mentores ou Patronos', cor: 'cinza', artigo: 'Art. 17º' },
    ],
    rotuloItem: 'Pessoa',
    colunas: [
      { campo: 'dados.email_institucional', rotulo: 'E-mail institucional', tipo: 'email' },
      { campo: 'dados.funcao', rotulo: 'Cargo ou função', tipo: 'texto' },
      { campo: 'diretoria', rotulo: 'Diretoria', tipo: 'diretoria' },
      { campo: 'status', rotulo: 'Situação', tipo: 'status' },
      { campo: 'dados.entrada', rotulo: 'Entrada', tipo: 'data' },
      { campo: 'dados.saida', rotulo: 'Saída', tipo: 'data' },
      { campo: 'dados.nivel_acesso', rotulo: 'Nível de acesso', tipo: 'select', opcoes: PAPEIS },
      { campo: 'confidencialidade', rotulo: 'Confidencialidade', tipo: 'confidencialidade' },
    ],
    campos: [
      { campo: 'dados.email_pessoal', rotulo: 'E-mail pessoal', tipo: 'email' },
      { campo: 'dados.telefone', rotulo: 'Telefone ou WhatsApp', tipo: 'telefone' },
      { campo: 'dados.linkedin', rotulo: 'LinkedIn', tipo: 'url' },
      {
        campo: 'dados.curso',
        rotulo: 'Curso',
        tipo: 'texto',
        ajuda:
          'Art. 13º: Membro Efetivo é exclusivamente estudante da Graduação em Administração da ' +
          'Escola de Negócios Saint Paul. Outros cursos só cabem em outra categoria, ou sob o ' +
          'Art. 117º §1º.',
      },
      { campo: 'dados.semestre', rotulo: 'Semestre atual', tipo: 'texto' },
      {
        campo: 'dados.processo_ingresso',
        rotulo: 'Processo seletivo de ingresso',
        tipo: 'texto',
        ajuda: 'Ciclo em que a pessoa entrou, por exemplo 2026.2 (Cap. V).',
      },
      { campo: 'dados.habilidades', rotulo: 'Habilidades', tipo: 'textolongo' },
      { campo: 'dados.observacoes', rotulo: 'Observações', tipo: 'textolongo' },
    ],
  },

  {
    slug: 'processo-seletivo',
    nome: 'Processo Seletivo',
    secao: 'Pessoas',
    tipo: 'quadro',
    descricao:
      'Candidatos e etapas do processo seletivo, com registro mínimo das decisões e confidencialidade adequada.',
    artigos: ['Art. 19º', 'Art. 20º', 'Art. 21º', 'Art. 22º', 'Art. 23º', 'Art. 24º', 'Art. 96º', 'Art. 97º'],
    notaEstatutaria:
      'O Art. 21º define as etapas possíveis. O Art. 22º condiciona a admissão como Membro Efetivo à conclusão da Academia Trainee e à avaliação final da Diretoria Executiva. O Art. 23º exige registro mínimo das decisões. O Art. 96º torna confidenciais as avaliações e dados pessoais de candidatos, por isso o padrão deste quadro é "confidencial".',
    confidencialidadePadrao: 'confidencial',
    statusOpcoes: [
      { valor: 'inscricao', rotulo: 'Inscrição', cor: 'cinza' },
      { valor: 'triagem', rotulo: 'Triagem', cor: 'cinza' },
      { valor: 'prova', rotulo: 'Prova ou exercício', cor: 'azul' },
      { valor: 'dinamica', rotulo: 'Dinâmica ou case', cor: 'azul' },
      { valor: 'entrevista', rotulo: 'Entrevista', cor: 'ambar' },
      { valor: 'academia_trainee', rotulo: 'Academia Trainee', cor: 'roxo' },
      { valor: 'deliberacao', rotulo: 'Deliberação', cor: 'ambar' },
      { valor: 'aprovado', rotulo: 'Aprovado', cor: 'verde' },
      { valor: 'nao_aprovado', rotulo: 'Não aprovado', cor: 'vermelho' },
      { valor: 'desistiu', rotulo: 'Desistiu', cor: 'cinza' },
    ],
    grupos: [
      { nome: 'Ciclo vigente', cor: 'verde' },
      { nome: 'Academia Trainee', cor: 'azul', artigo: 'Art. 21º VI, Art. 22º' },
      { nome: 'Ciclos anteriores', cor: 'cinza' },
    ],
    rotuloItem: 'Candidato',
    colunas: [
      { campo: 'dados.email', rotulo: 'E-mail', tipo: 'email' },
      { campo: 'status', rotulo: 'Etapa', tipo: 'status' },
      { campo: 'responsavel', rotulo: 'Avaliador responsável', tipo: 'pessoa' },
      { campo: 'dados.scorecard', rotulo: 'Scorecard', tipo: 'numero', ajuda: 'Art. 21º V' },
      { campo: 'prazo', rotulo: 'Próxima etapa em', tipo: 'data' },
      { campo: 'confidencialidade', rotulo: 'Confidencialidade', tipo: 'confidencialidade' },
    ],
    campos: [
      { campo: 'dados.telefone', rotulo: 'Telefone', tipo: 'telefone' },
      { campo: 'dados.curso_semestre', rotulo: 'Curso e semestre', tipo: 'texto', ajuda: 'Art. 20º II e Art. 13º' },
      { campo: 'dados.disponibilidade', rotulo: 'Disponibilidade declarada', tipo: 'texto', ajuda: 'Art. 19º' },
      { campo: 'dados.registro_decisao', rotulo: 'Registro da decisão', tipo: 'textolongo', ajuda: 'Art. 23º' },
      { campo: 'dados.observacoes', rotulo: 'Observações', tipo: 'textolongo' },
    ],
  },

  {
    slug: 'avaliacao',
    nome: 'Avaliação & Desenvolvimento',
    secao: 'Pessoas',
    tipo: 'quadro',
    descricao:
      'Ciclos de acompanhamento, feedback, avaliação 360 e planos de desenvolvimento individual.',
    artigos: ['Art. 74º', 'Art. 75º', 'Art. 76º', 'Art. 78º', 'Art. 80º'],
    notaEstatutaria:
      'O Art. 80º exige confidencialidade e acesso restrito às informações individuais de avaliação, com acesso limitado a quem responde pela consolidação e decisão. Por isso o padrão deste quadro é "restrito". O Art. 80º §1º alerta que, em grupos pequenos, o anonimato absoluto não é garantido. O Art. 78º lista os desdobramentos possíveis.',
    confidencialidadePadrao: 'restrito',
    statusOpcoes: [
      { valor: 'planejada', rotulo: 'Planejada', cor: 'cinza' },
      { valor: 'coleta', rotulo: 'Em coleta', cor: 'azul' },
      { valor: 'consolidacao', rotulo: 'Em consolidação', cor: 'ambar' },
      { valor: 'feedback_dado', rotulo: 'Feedback dado', cor: 'verde' },
      { valor: 'pdi_em_curso', rotulo: 'PDI em curso', cor: 'roxo' },
      { valor: 'encerrada', rotulo: 'Encerrada', cor: 'cinza' },
    ],
    grupos: [
      { nome: 'Trainees', cor: 'azul', artigo: 'Art. 74º' },
      { nome: 'Membros Efetivos', cor: 'verde', artigo: 'Art. 75º' },
      { nome: 'Diretoria Executiva', cor: 'pinho', artigo: 'Art. 76º, Art. 77º' },
    ],
    rotuloItem: 'Avaliação',
    colunas: [
      { campo: 'dados.avaliado', rotulo: 'Pessoa avaliada', tipo: 'pessoa' },
      { campo: 'dados.ciclo', rotulo: 'Ciclo', tipo: 'texto' },
      { campo: 'responsavel', rotulo: 'Avaliador', tipo: 'pessoa' },
      { campo: 'status', rotulo: 'Status', tipo: 'status' },
      { campo: 'prazo', rotulo: 'Prazo', tipo: 'data' },
      { campo: 'dados.desdobramento', rotulo: 'Desdobramento', tipo: 'select', opcoes: [
        { valor: 'feedback_formal', rotulo: 'Feedback formal' },
        { valor: 'reconhecimento', rotulo: 'Reconhecimento de performance' },
        { valor: 'pdi', rotulo: 'Plano individual de desenvolvimento' },
        { valor: 'checkpoint', rotulo: 'Checkpoint adicional' },
        { valor: 'ampliacao', rotulo: 'Ampliação de responsabilidade' },
        { valor: 'pip', rotulo: 'Plano de melhoria de performance' },
        { valor: 'realocacao', rotulo: 'Realocação de função' },
        { valor: 'advertencia', rotulo: 'Advertência' },
      ], ajuda: 'Art. 78º' },
      { campo: 'confidencialidade', rotulo: 'Confidencialidade', tipo: 'confidencialidade' },
    ],
    campos: [
      { campo: 'dados.competencias', rotulo: 'Competências avaliadas', tipo: 'textolongo', ajuda: 'Art. 75º e Art. 76º' },
      { campo: 'dados.feedback', rotulo: 'Feedback', tipo: 'textolongo' },
      { campo: 'dados.metas', rotulo: 'Metas', tipo: 'textolongo' },
      { campo: 'dados.plano', rotulo: 'Plano de desenvolvimento', tipo: 'textolongo' },
    ],
  },

  // ------------------------------------------------------------------ Técnico
  {
    slug: 'nucleos',
    nome: 'Núcleos Técnicos',
    secao: 'Técnico',
    tipo: 'quadro',
    descricao:
      'Projetos e entregáveis dos Núcleos Técnicos, com líder responsável, padrão de revisão e conexão com a formação.',
    artigos: ['Art. 46º', 'Art. 47º', 'Art. 48º', 'Art. 49º'],
    notaEstatutaria:
      'O Art. 47º parágrafo único deixa a definição de áreas, nomes, escopos e duração à Diretoria Executiva ou ao Regimento Interno, sem obrigatoriedade de manter determinado núcleo. Os grupos abaixo são, portanto, editáveis. O Art. 49º exige objetivos claros, entregáveis mínimos, líder responsável, calendário e padrão de revisão.',
    statusOpcoes: STATUS_EXECUCAO,
    grupos: [
      { nome: 'Equity Research', cor: 'verde' },
      { nome: 'Finanças Corporativas e M&A', cor: 'azul' },
      { nome: 'Macroeconomia e Renda Fixa', cor: 'ambar' },
      { nome: 'Asset Management', cor: 'roxo' },
      { nome: 'IA aplicada a finanças', cor: 'pinho', artigo: 'Art. 9º X, Cap. XXIII' },
      { nome: 'Núcleos em estruturação', cor: 'cinza', artigo: 'Art. 48º' },
    ],
    rotuloItem: 'Projeto técnico',
    colunas: [
      { campo: 'dados.lider', rotulo: 'Líder responsável', tipo: 'pessoa', ajuda: 'Art. 49º' },
      { campo: 'responsavel', rotulo: 'Owner da entrega', tipo: 'pessoa' },
      { campo: 'status', rotulo: 'Status', tipo: 'status' },
      { campo: 'prazo', rotulo: 'Prazo', tipo: 'data' },
      { campo: 'dados.entregavel', rotulo: 'Entregável', tipo: 'texto' },
      { campo: 'dados.revisao', rotulo: 'Padrão de revisão', tipo: 'texto' },
      { campo: 'prioridade', rotulo: 'Prioridade', tipo: 'prioridade' },
    ],
    campos: [
      { campo: 'dados.objetivos', rotulo: 'Objetivos', tipo: 'textolongo', ajuda: 'Art. 49º' },
      { campo: 'dados.integrantes', rotulo: 'Integrantes', tipo: 'textolongo' },
      { campo: 'risco', rotulo: 'Risco', tipo: 'texto' },
      { campo: 'blocker', rotulo: 'Blocker', tipo: 'texto' },
    ],
  },

  {
    slug: 'producao',
    nome: 'Produção Intelectual',
    secao: 'Técnico',
    tipo: 'quadro',
    descricao:
      'Relatórios, newsletters, artigos, one-pagers e pitchbooks, com revisão técnica, revisão institucional e aviso educacional.',
    artigos: ['Art. 9º III', 'Art. 53º', 'Art. 54º', 'Art. 100º', 'Art. 110º'],
    notaEstatutaria:
      'O Art. 54º exige aviso de caráter educacional quando aplicável, deixando claro que a publicação não constitui recomendação personalizada de investimento. O Art. 53º veda plágio, manipulação de informações e uso não declarado de conteúdo de terceiros. O Art. 100º e o Art. 110º mantêm a responsabilidade autoral humana sobre entregas apoiadas em IA.',
    statusOpcoes: [
      { valor: 'ideia', rotulo: 'Ideia', cor: 'cinza' },
      { valor: 'em_producao', rotulo: 'Em produção', cor: 'azul' },
      { valor: 'revisao_tecnica', rotulo: 'Revisão técnica', cor: 'ambar' },
      { valor: 'revisao_institucional', rotulo: 'Revisão institucional', cor: 'roxo' },
      { valor: 'aprovado', rotulo: 'Aprovado', cor: 'verde' },
      { valor: 'publicado', rotulo: 'Publicado', cor: 'verde' },
      { valor: 'arquivado', rotulo: 'Arquivado', cor: 'cinza' },
    ],
    grupos: [
      { nome: 'Equity research', cor: 'verde' },
      { nome: 'Newsletters e briefings', cor: 'azul' },
      { nome: 'Artigos e estudos de caso', cor: 'roxo' },
      { nome: 'One-pagers e pitchbooks', cor: 'ambar' },
      { nome: 'Materiais educacionais', cor: 'cinza', artigo: 'Cap. XXII' },
    ],
    rotuloItem: 'Material',
    colunas: [
      { campo: 'dados.tipo_material', rotulo: 'Tipo', tipo: 'select', opcoes: [
        { valor: 'equity_research', rotulo: 'Equity research' },
        { valor: 'newsletter', rotulo: 'Newsletter' },
        { valor: 'artigo', rotulo: 'Artigo' },
        { valor: 'estudo_caso', rotulo: 'Estudo de caso' },
        { valor: 'one_pager', rotulo: 'One-pager' },
        { valor: 'pitchbook', rotulo: 'Pitchbook' },
        { valor: 'briefing', rotulo: 'Briefing de mercado' },
        { valor: 'apresentacao', rotulo: 'Apresentação' },
      ] },
      { campo: 'responsavel', rotulo: 'Autoria responsável', tipo: 'pessoa' },
      { campo: 'status', rotulo: 'Status', tipo: 'status' },
      { campo: 'dados.revisao_tecnica', rotulo: 'Revisão técnica', tipo: 'pessoa', ajuda: 'Art. 40º III' },
      { campo: 'dados.revisao_institucional', rotulo: 'Revisão institucional', tipo: 'pessoa', ajuda: 'Art. 91º' },
      { campo: 'dados.aviso_educacional', rotulo: 'Aviso educacional', tipo: 'booleano', ajuda: 'Art. 54º' },
      { campo: 'prazo', rotulo: 'Prazo', tipo: 'data' },
    ],
    campos: [
      { campo: 'dados.tese', rotulo: 'Tese ou tema', tipo: 'textolongo' },
      { campo: 'dados.autorias', rotulo: 'Autorias', tipo: 'textolongo', ajuda: 'Art. 53º, Art. 110º' },
      { campo: 'dados.fonte_dados', rotulo: 'Fonte de dados', tipo: 'textolongo', ajuda: 'Art. 53º' },
      { campo: 'dados.documento_final', rotulo: 'Documento final', tipo: 'url' },
    ],
  },

  {
    slug: 'challenges',
    nome: 'Challenges & Competições',
    secao: 'Técnico',
    tipo: 'quadro',
    descricao:
      'Competições internas e externas, seleção de equipe, representação institucional e resultados.',
    artigos: ['Art. 55º', 'Art. 56º', 'Art. 57º', 'Art. 58º', 'Art. 59º', 'Art. 60º', 'Art. 61º', 'Art. 62º'],
    notaEstatutaria:
      'O Art. 56º classifica os challenges em internos, externos de participação aberta e externos de representação institucional ou vagas limitadas — daí os grupos. O Art. 57º nega direito automático de participação a diretores, Vice-Presidente ou Presidente. O Art. 60º exige declaração de conflito de interesse por quem seleciona e registro interno mínimo da decisão.',
    statusOpcoes: [
      { valor: 'mapeado', rotulo: 'Mapeado', cor: 'cinza' },
      { valor: 'em_avaliacao', rotulo: 'Em avaliação', cor: 'azul' },
      { valor: 'selecao_equipe', rotulo: 'Seleção de equipe', cor: 'ambar' },
      { valor: 'inscrito', rotulo: 'Inscrito', cor: 'roxo' },
      { valor: 'em_execucao', rotulo: 'Em execução', cor: 'azul' },
      { valor: 'concluido', rotulo: 'Concluído', cor: 'verde' },
      { valor: 'nao_participaremos', rotulo: 'Não participaremos', cor: 'vermelho' },
    ],
    grupos: [
      { nome: 'Internos', cor: 'verde', artigo: 'Art. 56º I' },
      { nome: 'Externos de participação aberta', cor: 'azul', artigo: 'Art. 56º II' },
      { nome: 'Externos de representação institucional', cor: 'pinho', artigo: 'Art. 56º III' },
    ],
    rotuloItem: 'Competição',
    colunas: [
      { campo: 'dados.organizador', rotulo: 'Organizador', tipo: 'texto' },
      { campo: 'status', rotulo: 'Status', tipo: 'status' },
      { campo: 'responsavel', rotulo: 'Responsável', tipo: 'pessoa' },
      { campo: 'dados.equipe', rotulo: 'Equipe', tipo: 'texto' },
      { campo: 'dados.prazo_inscricao', rotulo: 'Prazo de inscrição', tipo: 'data' },
      { campo: 'prazo', rotulo: 'Prazo da entrega', tipo: 'data' },
      { campo: 'dados.resultado', rotulo: 'Resultado', tipo: 'texto' },
    ],
    campos: [
      { campo: 'dados.participantes', rotulo: 'Participantes', tipo: 'textolongo' },
      { campo: 'dados.regulamento', rotulo: 'Regulamento', tipo: 'url' },
      { campo: 'dados.agenda', rotulo: 'Agenda', tipo: 'textolongo' },
      { campo: 'dados.classificacao', rotulo: 'Classificação', tipo: 'texto' },
      {
        campo: 'dados.conflito_interesse',
        rotulo: 'Declaração de conflito de interesse na seleção',
        tipo: 'textolongo',
        ajuda: 'Art. 60º e §1º: quem seleciona e também é candidato abstém-se da avaliação da própria candidatura.',
      },
      {
        campo: 'dados.registro_selecao',
        rotulo: 'Registro interno da seleção',
        tipo: 'textolongo',
        ajuda: 'Art. 60º §3º',
      },
    ],
  },
]

/** Itens de menu que não são quadros de dados, mas páginas próprias. */
export const PAGINAS = [
  {
    slug: 'painel',
    nome: 'Visão executiva',
    secao: 'Governança',
    tipo: 'pagina',
    href: '/painel',
    descricao: 'Indicadores executivos de execução, prazos, riscos e governança.',
    artigos: ['Art. 39º II', 'Art. 39º IV', 'Art. 63º §2º'],
  },
  {
    slug: 'estatuto',
    nome: 'Consulta ao Estatuto',
    secao: 'Governança',
    tipo: 'pagina',
    href: '/estatuto',
    descricao: 'Quem decide o quê, quóruns, busca de artigos e pergunta em linguagem natural.',
    artigos: ['Art. 45º', 'Art. 119º', 'Art. 120º'],
  },
  {
    slug: 'documentos',
    nome: 'Documentos e triagem por IA',
    secao: 'Governança',
    tipo: 'pagina',
    href: '/documentos',
    descricao: 'Recebe documentos, sugere roteamento por IA e exige revisão humana antes de distribuir.',
    artigos: ['Art. 100º', 'Art. 108º', 'Art. 109º', 'Art. 110º'],
  },
  {
    slug: 'diretoria',
    nome: 'Diretoria e permissões',
    secao: 'Configuração',
    tipo: 'pagina',
    href: '/diretoria',
    descricao: 'Usuários, papéis, diretorias e trilha de auditoria.',
    artigos: ['Art. 33º', 'Art. 45º', 'Art. 97º'],
  },
  {
    slug: 'configuracoes',
    nome: 'Configurações do sistema',
    secao: 'Configuração',
    tipo: 'pagina',
    href: '/configuracoes',
    descricao: 'Tema, integrações, saúde do sistema e informações de implantação.',
    artigos: ['Art. 118º VI'],
  },
]

export const SECOES = ['Governança', 'Relacionamento', 'Pessoas', 'Técnico', 'Configuração']

const ORDEM_MENU = [
  'painel',
  'deliberacoes',
  'operacao',
  'estatuto',
  'documentos',
  'crm',
  'parcerias',
  'membros',
  'processo-seletivo',
  'avaliacao',
  'nucleos',
  'producao',
  'challenges',
  'diretoria',
  'configuracoes',
]

function ordemMenu(slug) {
  const i = ORDEM_MENU.indexOf(slug)
  return i === -1 ? 999 : i
}

/** Menu completo: 15 itens, agrupados nas cinco seções. */
export const MENU = SECOES.map((secao) => ({
  secao,
  itens: [
    ...PAGINAS.filter((p) => p.secao === secao),
    ...QUADROS.filter((q) => q.secao === secao).map((q) => ({
      slug: q.slug,
      nome: q.nome,
      secao: q.secao,
      tipo: 'quadro',
      href: `/quadros/${q.slug}`,
      descricao: q.descricao,
      artigos: q.artigos,
    })),
  ].sort((a, b) => ordemMenu(a.slug) - ordemMenu(b.slug)),
}))

export const SLUGS_QUADROS = QUADROS.map((q) => q.slug)

export function obterQuadro(slug) {
  return QUADROS.find((q) => q.slug === slug) || null
}

/** Todos os campos configurados de um quadro, colunas e campos da gaveta. */
export function camposDoQuadro(quadro) {
  return [...(quadro.colunas || []), ...(quadro.campos || [])]
}

export function rotuloStatus(quadro, valor) {
  const s = (quadro.statusOpcoes || []).find((o) => o.valor === valor)
  return s ? s.rotulo : valor || '—'
}

export function corStatus(quadro, valor) {
  const s = (quadro.statusOpcoes || []).find((o) => o.valor === valor)
  return s ? s.cor : 'cinza'
}

export function rotuloDiretoria(valor) {
  const d = DIRETORIAS.find((x) => x.valor === valor)
  if (d) return d.rotulo
  const p = DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS.find((x) => x.valor === valor)
  return p ? `${p.rotulo} (${p.situacao})` : valor || '—'
}

export function podeMutar(papel) {
  return (NIVEL_PAPEL[papel] || 0) >= NIVEL_PAPEL.colaborador
}

export function podeAdministrar(papel) {
  return (NIVEL_PAPEL[papel] || 0) >= NIVEL_PAPEL.presidencia
}

/**
 * Pode adicionar pessoas à lista de acesso: Presidência e acima,
 * Vice-Presidência e o diretor da Diretoria Institucional. Revogar, reiniciar,
 * excluir e alterar papéis continua restrito a quem pode administrar.
 */
export function podeAdicionarAcesso(usuario) {
  if (!usuario) return false
  if ((NIVEL_PAPEL[usuario.papel] || 0) >= NIVEL_PAPEL.vice_presidencia) return true
  return usuario.papel === 'diretor' && usuario.diretoria === 'institucional'
}

export function podeAprovarTriagem(papel) {
  return (NIVEL_PAPEL[papel] || 0) >= NIVEL_PAPEL.diretor
}

/** Confidencialidade máxima que um papel pode ler. */
export function confidencialidadeMaxima(papel) {
  const nivel = NIVEL_PAPEL[papel] || 0
  if (nivel >= NIVEL_PAPEL.vice_presidencia) return 4
  if (nivel >= NIVEL_PAPEL.diretor) return 3
  if (nivel >= NIVEL_PAPEL.colaborador) return 2
  return 1
}
