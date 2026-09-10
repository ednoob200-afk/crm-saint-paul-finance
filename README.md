# CRM Saint Paul Finance

CRM institucional e gestor de trabalho da **Saint Paul Finance**, a Liga de Mercado Financeiro da
Escola de Negócios Saint Paul. Organiza a operação da diretoria, o relacionamento com organizações
e contatos, as deliberações e a triagem de documentos por IA — sempre fundamentado no **Estatuto
Oficial vigente**.

A organização dos painéis é inspirada na forma de trabalho do monday.com (grupos, colunas, status,
kanban, cronograma, responsáveis, prazos). Nenhum código, texto, componente ou elemento de
identidade visual do monday.com é utilizado: a identidade é própria da Saint Paul Finance.

---

## Sumário

- [Fonte de verdade institucional](#fonte-de-verdade-institucional)
- [Stack](#stack)
- [Arquitetura de pastas](#arquitetura-de-pastas)
- [Modelo de dados](#modelo-de-dados)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Instalação local](#instalação-local)
- [Deploy na Vercel](#deploy-na-vercel)
- [Lista de acesso](#lista-de-acesso)
- [Rotas e níveis de acesso](#rotas-e-níveis-de-acesso)
- [Segurança](#segurança)
- [Triagem por IA](#triagem-por-ia)
- [Testes, lint e build](#testes-lint-e-build)
- [Manutenção](#manutenção)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Fonte de verdade institucional

O sistema é derivado do **Estatuto Oficial da Saint Paul Finance, versão de setembro de 2026**:
121 artigos em 26 capítulos, indexados em `data/estatuto.json` e acessíveis por `lib/estatuto.js`.

Cada quadro, campo sensível, decisão e sugestão de roteamento aponta para um **rótulo canônico de
artigo** (`Art. 42º`), resolvido em capítulo, caput e parágrafos. Não há artigo guardado apenas como
texto solto, e a suíte de testes verifica que **toda referência citada pelo sistema existe no
Estatuto vigente**.

### Diretoria Financeira

O Art. 33º VII e o Art. 44º preveem a Diretoria Financeira apenas **"quando instituída"**. A Liga
não a instituiu. O sistema, portanto:

- **não** oferece "Diretoria Financeira" como diretoria atribuível;
- rejeita no servidor qualquer tentativa de atribuir item a ela, com mensagem que cita
  Art. 33º VII, Art. 44º e Art. 33º §2º;
- registra o orçamento e a prestação de contas como **grupo da Operação**, sob responsabilidade da
  Presidência e de responsável especificamente designado (Art. 33º §2º e Art. 44º parágrafo único);
- exibe a diretoria em `/diretoria` e `/estatuto` com a situação **"Prevista, não instituída"**,
  para que a informação estatutária não desapareça.

### Casos omissos

Quando não há base estatutária suficiente, o sistema não inventa regra: registra a dúvida e
encaminha à Presidência, na forma do Art. 120º II.

---

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | JavaScript. **Sem TypeScript** neste projeto |
| UI | React 19 e componentes próprios |
| Estilos | CSS próprio, centralizado em `app/globals.css`. Sem MUI, shadcn ou Tailwind |
| Tipografia | Spectral (serifada), IBM Plex Sans (interface), IBM Plex Mono (datas, artigos, ids) |
| Marca | Arquivos oficiais em `public/marca`, verde `#08382F` e branco, com troca por tema via CSS |
| Banco | PostgreSQL gerenciado (Neon, Supabase Postgres ou Vercel Postgres) |
| Acesso a dados | `pg` com SQL sempre parametrizado, isolado em `lib/db.js` e `lib/repositories/` |
| Validação | Zod, no servidor |
| API | Route Handlers em `app/api/**/route.js` |
| IA | `@anthropic-ai/sdk`, exclusivamente server-side |
| Storage | Vercel Blob (`@vercel/blob`) |
| Testes | Vitest |
| Deploy | Vercel |

### Regra de persistência

O banco PostgreSQL é a persistência oficial desde a primeira versão. `localStorage` é usado **apenas**
para a preferência de tema, sempre dentro de `try/catch`, e nenhum dado institucional depende dele.

Nenhum componente visual acessa banco, storage ou `localStorage` diretamente. Trocar de provedor de
Postgres exige mudar a `DATABASE_URL` e, no máximo, a política de TLS em `lib/db.js`.

---

## Arquitetura de pastas

```text
app/
  globals.css                  folha de estilo única, com os tokens de marca
  layout.js                    fontes, metadados, aplicação do tema antes da pintura
  page.js                      raiz: redireciona conforme a sessão
  not-found.js                 404 institucional
  global-error.js              anteparo de erro, sem stack trace público
  entrar/                      tela de acesso: entrar e primeiro acesso
  ativar/                      ativação por link de convite
  (painel)/                    área protegida
    layout.js                  verifica a sessão e monta a barra lateral
    painel/                    visão executiva
    quadros/[slug]/            os 10 quadros de dados
    estatuto/                  consulta ao Estatuto
    documentos/                documentos e triagem por IA
    diretoria/                 diretoria, permissões e auditoria
    configuracoes/             integrações, saúde e rotas
  api/
    saude/                     verificação pública de dependências
    auth/login | logout/
    quadros/[slug]/itens | grupos/
    itens/[id] | [id]/historico/
    documentos/ | [id]/ | [id]/triagem | [id]/aprovar
    estatuto/pergunta/
    usuarios/ | [id]/
    lista-acesso/ | [id]/
    primeiro-acesso/
    ativar/
    pessoas/

components/
  Base.js                      pastilha, avatar, prazo, artigo clicável, estado vazio
  Marca.js                     símbolo e lockups, com troca de cor por tema
  BarraLateral.js              navegação de 15 itens em cinco seções
  Cabecalho.js  AlternarTema.js  BotaoSair.js
  quadro/                      QuadroCliente, Tabela, Kanban, Cronograma, Gaveta,
                               NovoItem, CampoEditavel
  documentos/                  Triagem, RevisaoSugestao
  estatuto/                    PerguntaEstatuto
  diretoria/                   ListaAcesso, GestaoUsuarios

lib/
  db.js                        única porta de acesso ao Postgres
  auth.js                      sessões, papéis, origem, auditoria
  senha.mjs                    scrypt; usado pelo app e pelos scripts
  quadros.js                   configuração institucional dos quadros, papéis, quóruns
  estatuto.js                  índice do Estatuto, busca e verificação de artigo
  validacao.js                 schemas Zod e sanitização
  ia.js                        chamadas de IA, exclusivamente server-side
  storage.js                   Vercel Blob, limites e tipos aceitos
  respostas.js                 respostas de API padronizadas, sem vazar detalhe técnico
  formato.js                   formatação compartilhada, módulo puro
  emails.js                    leitura de listas de e-mail coladas, módulo puro
  repositories/                itens, grupos, usuarios, lista_acesso, documentos,
                               indicadores

db/migracoes/                  SQL numerado, idempotente e aditivo
scripts/                       migrate, seed, hash-senha, ambiente
data/estatuto.json             Estatuto indexado: 121 artigos, 26 capítulos
testes/                        81 testes de unidade e de coerência estatutária
```

### Menu: 15 itens em cinco seções

| # | Item | Tipo | Base estatutária |
|---|---|---|---|
| 1 | Visão executiva | página | Art. 39º II e IV, Art. 63º §2º |
| 2 | Deliberações & Atas | quadro | Art. 37º, Art. 63º–67º |
| 3 | Operação | quadro | Art. 39º, Art. 45º, Art. 63º |
| 4 | Consulta ao Estatuto | página | Art. 45º, Art. 119º, Art. 120º |
| 5 | Documentos e triagem por IA | página | Art. 100º, Art. 108º–110º |
| 6 | CRM Institucional | quadro | Art. 42º II e V, Art. 104º, Art. 97º |
| 7 | Pipeline de Parcerias | quadro | Art. 101º–104º, Art. 37º V, Art. 89º |
| 8 | Membros & Trainees | quadro | Art. 11º–18º |
| 9 | Processo Seletivo | quadro | Cap. V, Art. 21º, Art. 96º |
| 10 | Avaliação & Desenvolvimento | quadro | Cap. XVI, Art. 80º |
| 11 | Núcleos Técnicos | quadro | Cap. XI |
| 12 | Produção Intelectual | quadro | Cap. XII, Art. 54º |
| 13 | Challenges & Competições | quadro | Cap. XIII, Art. 56º–62º |
| 14 | Diretoria e permissões | página | Art. 33º, Art. 45º, Art. 97º |
| 15 | Configurações do sistema | página | Art. 118º VI |

Cada quadro possui três visões: **Tabela** (grupos recolhíveis, cabeçalho fixo, edição inline),
**Kanban** (arrastar e soltar altera o status e persiste) e **Cronograma** (itens agrupados por mês).

---

## Modelo de dados

Um modelo de item genérico serve os dez quadros. As colunas com semântica transversal — status,
responsável, prazo, risco, blocker, confidencialidade — são colunas tipadas; os campos próprios de
cada quadro ficam em `dados jsonb`, com as chaves restritas às declaradas em `lib/quadros.js`.

| Tabela | Papel |
|---|---|
| `lista_acesso` | **Whitelist**: quem está autorizado, com que papel e em que diretoria |
| `usuarios` | Quem já criou a senha: nome, e-mail, hash scrypt, papel, diretoria, ativo |
| `sessoes` | Sessões ativas; guarda apenas o **hash** do token |
| `grupos` | Grupos de cada quadro, com cor, ordem e artigo de fundamentação |
| `itens` | Itens dos quadros, com `dados`, `artigos` e `checklist` em jsonb |
| `historico` | Toda alteração relevante: tipo, campo, de, para, usuário, data e hora |
| `documentos` | Documentos recebidos, sugestão da IA, versão editada e aprovação |
| `auditoria` | Trilha de auditoria; nunca registra senha, token ou chave |
| `preferencias` | Preferência de tema por usuário |
| `_migracoes` | Controle das migrações aplicadas |

Índices cobrem quadro, grupo, status, prazo, responsável, diretoria e confidencialidade, além de um
índice de busca textual em português sobre `itens`.

### Confidencialidade

`publico → interno → confidencial → restrito`

A visibilidade é aplicada **na consulta ao banco**, não na interface (Art. 96º e Art. 97º §1º).
Processo Seletivo nasce como `confidencial`; Avaliação & Desenvolvimento nasce como `restrito`.
Item acima do nível do papel responde `404`, e não `403`, para não confirmar sua existência.

### Papéis

| Papel | Pode |
|---|---|
| Administrador do sistema | Configuração técnica e gestão de acessos |
| Presidência | Visão ampla, gestão de acessos, aprovação e decisão executiva (Art. 38º) |
| Vice-Presidência | Cadência, indicadores, riscos e blockers; lê inclusive o nível restrito (Art. 39º) |
| Diretor | Gerencia itens e distribui documentos triados (Art. 45º §3º) |
| Colaborador | Cria e edita itens; não distribui documento |
| Leitor | Consulta, sem mutação |

Nenhum usuário concede a si mesmo papel superior, altera o próprio papel ou desativa o próprio
acesso. Trocar papel, redefinir senha ou desativar **revoga as sessões abertas** daquele usuário.

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Nenhum valor real vai para o repositório.

| Variável | Obrigatória | Para que serve | Sem ela |
|---|---|---|---|
| `DATABASE_URL` | **sim** | Postgres de produção, com pooling | O sistema não funciona |
| `DIRECT_DATABASE_URL` | recomendada | Conexão direta usada por `npm run migrate` | Cai para `DATABASE_URL` |
| `AUTH_SECRET` | **sim** | Assinatura das sessões, mínimo 24 caracteres | Login indisponível |
| `ADMIN_EMAIL` | primeiro acesso | E-mail do primeiro administrador | `npm run seed` não cria usuário |
| `ADMIN_NOME` | opcional | Nome do primeiro administrador | Usa "Administrador do sistema" |
| `ADMIN_PASSWORD_HASH` | primeiro acesso | Hash scrypt gerado por `npm run hash-senha` | `npm run seed` não cria usuário |

| `ANTHROPIC_API_KEY` | opcional | Triagem e consulta por IA | Rotas de IA respondem 503 legível |
| `ANTHROPIC_MODEL` | opcional | Modelo usado | Usa `claude-opus-5` |
| `BLOB_READ_WRITE_TOKEN` | opcional | Upload de PDF e imagem | Upload recusado; "Colar texto" continua |
| `NEXT_PUBLIC_APP_URL` | opcional | URL pública | Somente informativo |
| `PGSSL_NO_VERIFY` | raro | `1` apenas se o provedor usa CA própria na conexão direta | TLS verificado, o padrão |

Gere o segredo de sessão com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Gere o hash da senha administrativa com:

```bash
npm run hash-senha
```

A senha é lida do terminal sem eco, nunca fica em arquivo nem no histórico do shell, e **nenhuma
senha em texto puro é aceita ou guardada** em qualquer camada.

> A chave da IA, a string do banco, o segredo de sessão e o token do storage nunca aparecem no
> navegador, no bundle público, no HTML ou nos logs. Nenhum segredo usa o prefixo `NEXT_PUBLIC_`.

---

## Instalação local

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL e AUTH_SECRET
npm run migrate
npm run seed
npm run dev
```

Abra `http://localhost:3000`. A rota `/api/saude` informa o que ainda falta configurar.

---

## Deploy na Vercel

### 1. Criar o projeto

```bash
vercel link
```

Ou importe o repositório em `vercel.com/new`. O framework é detectado como Next.js; não é preciso
alterar comandos de build.

### 2. Conectar o PostgreSQL

Crie um banco em **Neon**, **Supabase** ou **Vercel Postgres**. Em Neon e Vercel Postgres, a
integração do Marketplace já injeta as variáveis no projeto. Manualmente:

```bash
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development
```

Use a string **com pooling** em `DATABASE_URL` e a string direta em `DIRECT_DATABASE_URL`.

### 3. Aplicar as migrações

```bash
vercel env pull .env.local
npm run migrate
npm run seed
```

As migrações são idempotentes e **aditivas**: reaplicar não apaga dados existentes. O `seed` cria os
grupos previstos no Estatuto e o primeiro administrador. **Nenhum dado de exemplo é inserido** — os
quadros começam vazios, com estado vazio e formulário de criação.

### 4. Adicionar as demais variáveis

Adicione em **Development, Preview e Production**:

```bash
vercel env add AUTH_SECRET
vercel env add ANTHROPIC_API_KEY
vercel env add ADMIN_EMAIL
vercel env add ADMIN_PASSWORD_HASH
```

### 5. Configurar o storage

Em **Storage → Create → Blob**, crie um Blob Store e conecte-o ao projeto. A Vercel injeta
`BLOB_READ_WRITE_TOKEN` automaticamente. Sem ele, o envio de PDF e imagem é recusado com mensagem
legível e o fluxo de texto colado continua disponível — nada é gravado no filesystem da função,
que é efêmero.

### 6. Publicar

```bash
vercel --prod
```

Ou faça push na branch principal, se o projeto estiver conectado ao GitHub.

### 7. Domínio

Em **Settings → Domains**, adicione o domínio da Liga e siga as instruções de DNS. Atualize
`NEXT_PUBLIC_APP_URL` depois.

### 8. Verificar

1. `https://SEU-DOMINIO/api/saude` deve responder `{"situacao":"ok"}` com `banco.migrado: true`.
2. `https://SEU-DOMINIO/entrar` deve aceitar o login administrativo.
3. `/painel` deve abrir com os indicadores em estado vazio, sem número inventado.

### Compatibilidade serverless

- Nenhum servidor persistente local é necessário.
- Nenhum arquivo é gravado no filesystem da função: arquivos vão para o Blob.
- O pool de conexões é pequeno por instância (`PG_POOL_MAX`, padrão 3) e reciclado rapidamente.
- Toda query tem `statement_timeout` de 15 s; as rotas de IA declaram `maxDuration = 60`.
- Uploads têm limite de 8 MB, com tipo e tamanho validados no servidor.

---

## Lista de acesso

Quem pode entrar no sistema é definido em **`/diretoria` → Lista de acesso**, e não pela simples
existência de um registro de usuário. A lista é a autoridade: no login, além da senha, o sistema
confere se o e-mail continua autorizado (Art. 97º §1º).

### Como a diretoria libera alguém

1. A Presidência abre `/diretoria` e cola os e-mails na Lista de acesso — um por linha ou
   separados por vírgula, até 50 por vez.
2. Escolhe **o que a pessoa pode fazer** (o papel, descrito em linguagem simples na própria tela) e
   a diretoria.
3. A pessoa abre `/entrar`, escolhe **Primeiro acesso**, informa o e-mail autorizado e **cria a
   própria senha**.

Ninguém transmite senha por mensagem, e nem a Presidência conhece a senha de outra pessoa: o banco
guarda apenas o hash scrypt.

### As duas formas de primeiro acesso

Cada entrada da lista escolhe uma delas, e a Presidência pode trocar a qualquer momento:

| Forma | Como funciona | Quando usar |
|---|---|---|
| **Direto na tela de acesso** (padrão) | A pessoa vai a `/entrar` → Primeiro acesso e cria a senha com o e-mail autorizado | Uso normal, dentro da Liga |
| **Só com link de convite** | A Presidência gera um link, copia e envia por canal seguro; só quem tem o link ativa | Papéis sensíveis, ou quando o e-mail é público |

**O risco do modo direto, declarado.** E-mails institucionais são previsíveis
(`nome.sobrenome@saintpaul.edu.br`), então quem souber um e-mail que está na lista pode criar a
senha antes do titular. As defesas são: a lista é pequena e interna; a janela existe apenas até o
titular ativar; a ativação vai para a trilha de auditoria com data, hora e IP; e a Presidência pode
revogar e reemitir a qualquer momento. Para papéis sensíveis, use o modo por link, que não tem esse
risco.

### Revogação

**Revogar acesso** desliga de verdade: apaga o convite pendente, desativa o usuário e **encerra as
sessões abertas** na hora. Alterar o papel também encerra as sessões, para que a mudança valha
imediatamente.

Quem já ativou o acesso **não é removido** da lista, é revogado — o Art. 42º VIII e o Art. 72º
parágrafo único exigem preservar a memória institucional. Só convite nunca usado pode ser apagado.

### Limites de quem gerencia

- A gestão da lista exige papel de **Presidência** ou de administrador do sistema.
- Ninguém concede papel acima do próprio.
- Ninguém altera o próprio papel nem revoga o próprio acesso.
- O link de convite é guardado apenas como hash: só pode ser copiado no momento em que é gerado.
  Perdido, gera-se outro. Cada link vale 14 dias e serve uma única vez.

### Caminho alternativo

Em `/diretoria` há também **"Criar acesso definindo a senha você mesmo"**, recolhido por padrão.
Serve à exceção em que a pessoa não pode criar a própria senha. Nesse caso, entregue a senha por
canal seguro e peça a troca — a lista de acesso é o caminho preferencial justamente por dispensar
isso.

---

## Rotas e níveis de acesso

### Públicas

| Rota | Observação |
|---|---|
| `/` | Redireciona conforme a sessão |
| `/entrar` | Tela de acesso: entrar e primeiro acesso |
| `/ativar` | Ativação por link de convite; protegida pelo próprio token |
| `/api/saude` | Diz apenas **se** cada dependência existe; nunca mostra valor |
| `/api/auth/login` | Com limitação de tentativas por IP |
| `/api/primeiro-acesso` | Exige e-mail na lista de acesso; resposta genérica e limitação por IP |
| `/api/ativar` | Exige token de convite válido, de uso único |

### Protegidas

| Rota | Exige |
|---|---|
| `/painel`, `/quadros/[slug]`, `/estatuto`, `/documentos`, `/configuracoes` | Sessão |
| `/diretoria` | Sessão; a gestão de acessos exige Presidência |
| `GET /api/quadros/[slug]/itens`, `/api/itens/[id]`, `/api/itens/[id]/historico`, `/api/pessoas` | Sessão |
| `POST /api/quadros/[slug]/itens`, `PATCH /api/itens/[id]`, `POST /api/documentos`, `POST /api/documentos/[id]/triagem` | Colaborador |
| `DELETE /api/itens/[id]`, `POST /api/quadros/[slug]/grupos`, `POST /api/documentos/[id]/aprovar` | Diretor |
| `/api/usuarios`, `/api/usuarios/[id]`, `/api/lista-acesso`, `/api/lista-acesso/[id]` | Presidência |
| `POST /api/estatuto/pergunta` | Sessão |

---

## Segurança

- Sessão em cookie `HttpOnly`, `Secure` em produção, `SameSite=Lax`, com 12 horas de validade.
- O banco guarda apenas o **hash SHA-256** do token de sessão; o token é assinado com `AUTH_SECRET`
  e um token forjado é rejeitado antes de qualquer consulta.
- Senhas com **scrypt** (N=16384, r=8, p=1) e sal aleatório de 16 bytes, comparação em tempo
  constante. Login com e-mail inexistente executa o mesmo trabalho de derivação, para não vazar a
  existência da conta pelo tempo de resposta.
- Toda mutação verifica sessão, papel e **origem** da requisição (CSRF), além do `SameSite`.
- Toda entrada é validada com Zod no servidor; a validação do navegador é apenas conveniência.
- SQL sempre parametrizado. Nenhuma interpolação de valor em texto de query.
- Sanitização de conteúdo: caracteres de controle, blocos executáveis (`<script>` e afins com o
  conteúdo), atributos `on*` e `javascript:` são removidos antes de gravar.
- Chaves de `dados` restritas às declaradas no quadro: campo não previsto é descartado.
- Cabeçalhos de segurança em `next.config.mjs`: CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`.
- Erros nunca expõem stack trace, nome de tabela ou string de conexão; o detalhe fica no log.
- Trilha de auditoria em `/diretoria`, sem segredos. Registra login, login negado, primeiro acesso
  ativado e negado, alteração da lista de acesso, criação e exclusão de item, triagem por IA e
  distribuição de documento.
- Entrar exige, além da senha correta, que o e-mail continue na lista de acesso ativa. Revogar
  encerra as sessões abertas.
- O link de convite é guardado apenas como hash SHA-256, tem uso único e validade de 14 dias.
- Registros de pessoas **não são excluídos**: a exclusão em Membros & Trainees é recusada com a
  base do Art. 42º VIII e do Art. 72º parágrafo único; altere a situação para "Desligado" ou
  "Alumni".

---

## Triagem por IA

`/documentos` recebe texto colado ou arquivo (`.txt`, `.md`, `.csv`, `.json`, PDF, PNG, JPEG, GIF,
WEBP; até 8 MB). PDF e imagem são lidos **nativamente pelo modelo**; arquivos de texto têm o
conteúdo extraído no envio.

A IA é chamada apenas em `app/api/documentos/[id]/triagem/route.js` e
`app/api/estatuto/pergunta/route.js`, sempre no servidor. O **Estatuto integral** vai no prefixo do
`system`, marcado para cache de prompt: o modelo nunca precisa supor um artigo que não recebeu, e as
chamadas seguintes leem o Estatuto do cache.

O fluxo é:

1. a rota verifica autenticação, tipo e tamanho do arquivo, e trata timeout;
2. a IA devolve JSON, que é **validado com Zod**;
3. artigo citado que não existe no Estatuto vigente é **descartado**, com aviso na tela;
4. quadro, grupo e diretoria sugeridos são conferidos contra a estrutura real;
5. o resultado abre em **formulário inteiramente editável**;
6. só ao clicar em **Aprovar e distribuir** — ação restrita a Diretor ou superior — um item é criado.

O item aprovado registra quem aprovou, data e hora, o conteúdo original ou a referência ao
documento, a sugestão original da IA, as alterações manuais e os artigos usados no roteamento.

**A revisão humana é obrigatória.** Nenhuma interpretação da IA se converte em decisão
institucional sozinha (Art. 100º e Art. 110º).

### JSON esperado da IA

```json
{
  "titulo": "",
  "tipo": "ata|decisao|tarefa|parceria|comunicacao|candidato|producao|evento|outro",
  "diretoriaCompetente": "",
  "coResponsavel": "",
  "quadroDestino": "",
  "grupoDestino": "",
  "resumo": "",
  "descricaoCompleta": "",
  "confidencialidade": "publico|interno|confidencial|restrito",
  "artigosAplicaveis": [{ "artigo": "", "justificativa": "" }],
  "prioridade": "baixa|media|alta|critica",
  "prazo": null,
  "proximoPasso": "",
  "organizacao": "",
  "email": "",
  "telefone": "",
  "responsavelSugerido": "",
  "riscos": [],
  "justificativaDoRoteamento": ""
}
```

### Rubrica de roteamento

| Conteúdo identificado | Destino | Base |
|---|---|---|
| Parceria ou patrocínio com recurso | Institucional, Presidência co-responsável | Art. 104º §1º e §3º, Art. 37º V |
| Material público, marca ou logotipo | Comunicação; validação institucional se citar a Escola | Art. 91º, Art. 43º II |
| Currículo, inscrição ou avaliação de candidato | Institucional, Processo Seletivo, confidencial | Art. 24º, Art. 42º IV, Art. 96º |
| Equity research, valuation, one-pager, pitchbook | Formação, Produção Intelectual, aviso educacional | Art. 40º III, Art. 54º |
| Regulamento ou convite de challenge | Formação, Institucional co-responsável | Art. 59º |
| Ata, pauta ou proposta de alteração estatutária | Deliberações, com instância e quórum | Art. 67º, Art. 65º, Art. 112º |
| Avaliação de performance ou feedback 360 | Vice-Presidência, restrito | Art. 39º VIII, Art. 80º |
| Orçamento, nota fiscal, reembolso, valores | Presidência, grupo de orçamento. **Sem Diretoria Financeira** | Art. 33º §2º, Art. 44º p.ú., Art. 88º |
| Convite de palestra, mentoria, visita técnica | Institucional, Parcerias; Eventos se houver logística | Art. 102º, Art. 104º §2º |
| Sem encaixe claro | Presidência, registrado como caso omisso | Art. 120º II |

---

## Testes, lint e build

```bash
npm run lint     # ESLint 9 com eslint-config-next
npm test         # 81 testes, sem necessidade de banco
npm run build    # build de produção
```

Os testes cobrem hash de senha, índice do Estatuto, validação e sanitização, leitura de listas de
e-mail, formatação de datas e prazos, permissões por papel e **coerência estatutária**: todo artigo citado por quadro, página,
quórum, tabela de decisão ou diretoria precisa existir no Estatuto vigente, e nenhuma Diretoria
Financeira pode aparecer como atribuível.

---

## Manutenção

- **Novo quadro ou coluna**: edite `lib/quadros.js`. Tabela, kanban, cronograma, gaveta, filtros,
  validação e triagem passam a reconhecê-lo sem outra alteração. Declare a base estatutária: o teste
  de coerência falha se o artigo não existir.
- **Novo Estatuto**: regere `data/estatuto.json` a partir do documento oficial e rode `npm test`.
  As referências que deixarem de existir aparecem como falha, e não como texto errado em produção.
- **Alteração de esquema**: crie um novo arquivo numerado em `db/migracoes/`. Nunca edite uma
  migração já aplicada — o `migrate` avisa quando o conteúdo de uma migração aplicada mudou.
- **Trocar de provedor de Postgres**: altere `DATABASE_URL` e, se necessário, a política de TLS em
  `lib/db.js`.
- **Rotação de segredos**: trocar `AUTH_SECRET` invalida todas as sessões, por desenho.
- **Credenciais**: entregue senha inicial por canal seguro e peça a troca no primeiro acesso.
  Nunca coloque credencial em código, em issue ou no repositório.

---

## Limitações conhecidas

- **Extração de texto de PDF e imagem depende da IA.** Sem `ANTHROPIC_API_KEY`, esses arquivos podem
  ser recebidos e guardados, mas não triados; para classificar sem IA, cole o texto.
- **Upload exige Blob Storage.** Sem `BLOB_READ_WRITE_TOKEN`, PDF e imagem são recusados com
  mensagem legível, porque a função da Vercel não guarda arquivos.
- **A limitação de tentativas de login é por instância.** Em serverless a memória não é
  compartilhada; ela reduz força bruta, mas não substitui um rate limit de plataforma.
- **Não há troca de senha pelo próprio usuário depois da ativação.** A redefinição é feita pela
  Presidência em `/diretoria`, revogando e readicionando a pessoa à lista de acesso.
- **Não há envio de e-mail.** O sistema não dispara convite por e-mail: a Presidência copia o
  endereço de primeiro acesso, ou o link de convite, e envia pelo canal que a Liga já usa. Por
  isso o e-mail não é verificado, e o modo direto tem o risco descrito em
  [Lista de acesso](#lista-de-acesso).
- **Não há testes de ponta a ponta com Playwright.** A verificação de interface foi feita em
  navegador real; a automação de E2E fica como próximo passo.
- **A ordenação de itens dentro do grupo não é reordenável por arraste.** A alça `⠿` move a linha
  entre grupos; a ordem interna segue o campo `ordem` e a data de criação.
- **A busca da tabela é feita no cliente** sobre os itens já carregados, com teto de 2000 itens por
  quadro na consulta. Acima disso, use os filtros.

---

Saint Paul Finance · Escola de Negócios Saint Paul · São Paulo
