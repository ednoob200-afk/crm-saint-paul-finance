-- ===========================================================================
-- Saint Paul Finance — instalação completa do banco
--
-- Gerado por scripts/gerar-sql-completo.mjs. Não edite à mão.
-- Cole tudo no editor SQL do provedor e execute uma única vez.
--
-- É idempotente: executar de novo não apaga dados nem duplica registros.
-- Equivale a `npm run migrate` seguido de `npm run seed`.
-- ===========================================================================

BEGIN;

-- Controle de migrações, igual ao criado por scripts/migrate.mjs ------------
CREATE TABLE IF NOT EXISTS _migracoes (
  nome        text PRIMARY KEY,
  hash        text NOT NULL,
  aplicada_em timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Migração 001_inicial.sql
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 001 — Estrutura inicial do CRM Saint Paul Finance
-- Idempotente: pode ser reaplicada sem apagar dados existentes.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Usuários do sistema ------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text        NOT NULL,
  email          text        NOT NULL,
  senha_hash     text        NOT NULL,
  papel          text        NOT NULL DEFAULT 'leitor',
  diretoria      text,
  ativo          boolean     NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unico
  ON usuarios (lower(email));

-- Sessões ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  token_hash   text        NOT NULL,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  expira_em    timestamptz NOT NULL,
  user_agent   text,
  ip           text
);

CREATE UNIQUE INDEX IF NOT EXISTS sessoes_token_unico ON sessoes (token_hash);
CREATE INDEX IF NOT EXISTS sessoes_usuario ON sessoes (usuario_id);
CREATE INDEX IF NOT EXISTS sessoes_expira ON sessoes (expira_em);

-- Grupos dos quadros -------------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro        text        NOT NULL,
  nome          text        NOT NULL,
  cor           text        NOT NULL DEFAULT 'cinza',
  artigo        text,
  ordem         integer     NOT NULL DEFAULT 0,
  recolhido     boolean     NOT NULL DEFAULT false,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS grupos_quadro_nome ON grupos (quadro, nome);
CREATE INDEX IF NOT EXISTS grupos_quadro ON grupos (quadro, ordem);

-- Itens --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quadro             text        NOT NULL,
  grupo_id           uuid        REFERENCES grupos (id) ON DELETE SET NULL,
  titulo             text        NOT NULL,
  status             text,
  prioridade         text        NOT NULL DEFAULT 'media',
  responsavel        text,
  co_responsavel     text,
  diretoria          text,
  prazo              date,
  risco              text,
  blocker            text,
  proximo_passo      text,
  origem             text,
  confidencialidade  text        NOT NULL DEFAULT 'interno',
  descricao          text,
  dados              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  artigos            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  checklist          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  documento_id       uuid,
  ordem              integer     NOT NULL DEFAULT 0,
  criado_por         text,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itens_quadro ON itens (quadro);
CREATE INDEX IF NOT EXISTS itens_grupo ON itens (grupo_id);
CREATE INDEX IF NOT EXISTS itens_status ON itens (quadro, status);
CREATE INDEX IF NOT EXISTS itens_prazo ON itens (prazo);
CREATE INDEX IF NOT EXISTS itens_responsavel ON itens (responsavel);
CREATE INDEX IF NOT EXISTS itens_diretoria ON itens (diretoria);
CREATE INDEX IF NOT EXISTS itens_confidencialidade ON itens (confidencialidade);

-- Histórico de alterações --------------------------------------------------
CREATE TABLE IF NOT EXISTS historico (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid        NOT NULL REFERENCES itens (id) ON DELETE CASCADE,
  tipo       text        NOT NULL,
  campo      text,
  valor_de   text,
  valor_para text,
  usuario    text        NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS historico_item ON historico (item_id, criado_em DESC);

-- Documentos e triagem por IA ---------------------------------------------
CREATE TABLE IF NOT EXISTS documentos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text        NOT NULL,
  tipo_arquivo       text,
  tamanho            integer,
  url                text,
  conteudo_texto     text,
  status             text        NOT NULL DEFAULT 'recebido',
  sugestao_ia        jsonb,
  sugestao_editada   jsonb,
  erro_ia            text,
  modelo_ia          text,
  confidencialidade  text        NOT NULL DEFAULT 'interno',
  criado_por         text        NOT NULL,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  triado_em          timestamptz,
  aprovado_por       text,
  aprovado_em        timestamptz,
  item_id            uuid        REFERENCES itens (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS documentos_status ON documentos (status, criado_em DESC);

-- Trilha de auditoria ------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario    text,
  papel      text,
  acao       text        NOT NULL,
  recurso    text,
  detalhe    text,
  ip         text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_criado_em ON auditoria (criado_em DESC);

-- Preferências por usuário (tema etc.) ------------------------------------
CREATE TABLE IF NOT EXISTS preferencias (
  usuario_id  uuid PRIMARY KEY REFERENCES usuarios (id) ON DELETE CASCADE,
  tema        text NOT NULL DEFAULT 'sistema',
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO _migracoes (nome, hash) VALUES ('001_inicial.sql', '786316a4ba0cdb09')
  ON CONFLICT (nome) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Migração 002_documento_item.sql
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 002 — Vínculo do item com o documento de origem e integridade referencial
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'itens_documento_fk'
  ) THEN
    ALTER TABLE itens
      ADD CONSTRAINT itens_documento_fk
      FOREIGN KEY (documento_id) REFERENCES documentos (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS itens_documento ON itens (documento_id);

-- Busca textual nos itens, usada pelo campo de busca dos quadros.
CREATE INDEX IF NOT EXISTS itens_busca ON itens
  USING gin (to_tsvector('portuguese',
    coalesce(titulo, '') || ' ' ||
    coalesce(descricao, '') || ' ' ||
    coalesce(responsavel, '') || ' ' ||
    coalesce(proximo_passo, '')));

INSERT INTO _migracoes (nome, hash) VALUES ('002_documento_item.sql', 'bbb0acbbe5afaed1')
  ON CONFLICT (nome) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Migração 003_lista_acesso.sql
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 003 — Lista de acesso (whitelist institucional)
--
-- Quem pode entrar no sistema é definido aqui, e não pela simples existência
-- de um registro em `usuarios`. A entrada define o papel e a diretoria; a
-- pessoa cria a própria senha por um link de convite de uso único, de modo que
-- ninguém precise distribuir senha por mensagem.
--
-- Fundamento: Art. 97º §1º (acesso restrito a quem tem necessidade funcional
-- legítima) e Art. 38º (a Presidência responde pela gestão institucional).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lista_acesso (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text        NOT NULL,
  nome               text,
  papel              text        NOT NULL DEFAULT 'colaborador',
  diretoria          text,
  observacao         text,
  ativo              boolean     NOT NULL DEFAULT true,
  convite_token_hash text,
  convite_expira_em  timestamptz,
  ativado_em         timestamptz,
  usuario_id         uuid        REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_por         text,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lista_acesso_email
  ON lista_acesso (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS lista_acesso_token
  ON lista_acesso (convite_token_hash)
  WHERE convite_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS lista_acesso_ativo ON lista_acesso (ativo);

-- Ninguém pode ser trancado para fora pela introdução da lista: quem já tinha
-- acesso entra nela como já ativado.
INSERT INTO lista_acesso (email, nome, papel, diretoria, ativo, ativado_em, usuario_id, criado_por)
SELECT u.email, u.nome, u.papel, u.diretoria, u.ativo, u.criado_em, u.id, 'migração 003'
  FROM usuarios u
ON CONFLICT DO NOTHING;

INSERT INTO _migracoes (nome, hash) VALUES ('003_lista_acesso.sql', 'daa9d6867a22b7d8')
  ON CONFLICT (nome) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Migração 004_primeiro_acesso.sql
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 004 — Primeiro acesso direto
--
-- Por padrão, quem está na lista de acesso cria a própria senha na tela de
-- acesso, sem precisar de link. Para casos sensíveis, a Presidência pode
-- exigir link de convite naquela entrada específica.
-- ---------------------------------------------------------------------------

ALTER TABLE lista_acesso
  ADD COLUMN IF NOT EXISTS primeiro_acesso_livre boolean NOT NULL DEFAULT true;

-- Registra como o acesso foi ativado, para a trilha de auditoria.
ALTER TABLE lista_acesso
  ADD COLUMN IF NOT EXISTS ativado_por text;

INSERT INTO _migracoes (nome, hash) VALUES ('004_primeiro_acesso.sql', 'eb2b0d227dae4489')
  ON CONFLICT (nome) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Grupos previstos no Estatuto, por quadro
-- ---------------------------------------------------------------------------
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('deliberacoes', 'Assembleia Geral', 'pinho', NULL, 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('deliberacoes', 'Diretoria Executiva', 'verde', NULL, 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('deliberacoes', 'Presidência', 'roxo', NULL, 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('deliberacoes', 'Vice-Presidência', 'azul', NULL, 3) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('deliberacoes', 'Diretoria Funcional', 'cinza', NULL, 4) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('deliberacoes', 'Alteração estatutária', 'ambar', NULL, 5) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Presidência', 'pinho', 'Art. 38º', 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Vice-Presidência', 'verde', 'Art. 39º', 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Formação', 'azul', 'Art. 40º', 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Institucional', 'roxo', 'Art. 42º', 3) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Eventos', 'ambar', 'Art. 41º', 4) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Comunicação', 'cinza', 'Art. 43º', 5) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Orçamento e prestação de contas', 'vermelho', 'Art. 33º §2º, Art. 44º parágrafo único, Art. 88º', 6) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('operacao', 'Extensão e impacto social', 'verde', 'Cap. XXII, Art. 105º', 7) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('crm', 'Bancos e assets', 'pinho', NULL, 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('crm', 'Boutiques e consultorias', 'verde', NULL, 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('crm', 'Empresas', 'azul', NULL, 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('crm', 'Academia e alumni', 'roxo', 'Art. 15º', 3) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('crm', 'Conselheiros, mentores e patronos', 'ambar', 'Art. 17º', 4) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('crm', 'Outros contatos', 'cinza', NULL, 5) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('parcerias', 'Mentorias e office hours', 'azul', 'Art. 102º', 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('parcerias', 'Palestras e painéis', 'ambar', 'Art. 102º', 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('parcerias', 'Visitas técnicas', 'verde', 'Art. 102º', 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('parcerias', 'Patrocínios e apoios', 'vermelho', 'Art. 85º, Art. 89º', 3) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('parcerias', 'Challenges e competições', 'roxo', 'Art. 55º', 4) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('parcerias', 'Projetos especiais', 'cinza', 'Art. 102º', 5) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('membros', 'Membros Fundadores', 'pinho', 'Art. 12º', 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('membros', 'Membros Efetivos', 'verde', 'Art. 13º', 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('membros', 'Trainees', 'azul', 'Art. 14º', 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('membros', 'Membros Alumni', 'roxo', 'Art. 15º', 3) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('membros', 'Membros Honorários', 'ambar', 'Art. 16º', 4) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('membros', 'Conselheiros, Mentores ou Patronos', 'cinza', 'Art. 17º', 5) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('processo-seletivo', 'Ciclo vigente', 'verde', NULL, 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('processo-seletivo', 'Academia Trainee', 'azul', 'Art. 21º VI, Art. 22º', 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('processo-seletivo', 'Ciclos anteriores', 'cinza', NULL, 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('avaliacao', 'Trainees', 'azul', 'Art. 74º', 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('avaliacao', 'Membros Efetivos', 'verde', 'Art. 75º', 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('avaliacao', 'Diretoria Executiva', 'pinho', 'Art. 76º, Art. 77º', 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('nucleos', 'Equity Research', 'verde', NULL, 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('nucleos', 'Finanças Corporativas e M&A', 'azul', NULL, 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('nucleos', 'Macroeconomia e Renda Fixa', 'ambar', NULL, 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('nucleos', 'Asset Management', 'roxo', NULL, 3) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('nucleos', 'IA aplicada a finanças', 'pinho', 'Art. 9º X, Cap. XXIII', 4) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('nucleos', 'Núcleos em estruturação', 'cinza', 'Art. 48º', 5) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('producao', 'Equity research', 'verde', NULL, 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('producao', 'Newsletters e briefings', 'azul', NULL, 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('producao', 'Artigos e estudos de caso', 'roxo', NULL, 2) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('producao', 'One-pagers e pitchbooks', 'ambar', NULL, 3) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('producao', 'Materiais educacionais', 'cinza', 'Cap. XXII', 4) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('challenges', 'Internos', 'verde', 'Art. 56º I', 0) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('challenges', 'Externos de participação aberta', 'azul', 'Art. 56º II', 1) ON CONFLICT (quadro, nome) DO NOTHING;
INSERT INTO grupos (quadro, nome, cor, artigo, ordem) VALUES ('challenges', 'Externos de representação institucional', 'pinho', 'Art. 56º III', 2) ON CONFLICT (quadro, nome) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Primeiro administrador, autorizado na lista de acesso.
-- Nenhuma senha é criada aqui: a pessoa define a própria em /entrar,
-- escolhendo "Primeiro acesso".
-- ---------------------------------------------------------------------------
INSERT INTO lista_acesso (email, papel, ativo, criado_por, primeiro_acesso_livre)
VALUES ('eduardo.nonaka.gadm@saintpaul.edu.br', 'administrador', true, 'instalação', true)
ON CONFLICT DO NOTHING;

UPDATE lista_acesso
   SET ativo = true, papel = 'administrador', atualizado_em = now()
 WHERE lower(email) = 'eduardo.nonaka.gadm@saintpaul.edu.br';

-- Se uma execução anterior deste instalador autorizou outro e-mail que
-- nunca foi usado, a autorização é removida: acesso administrativo solto
-- é risco, e o Art. 97º §1º restringe o acesso a quem tem necessidade
-- funcional. Entradas já ativadas ou criadas por pessoas não são tocadas.
DELETE FROM lista_acesso
 WHERE criado_por = 'instalação'
   AND ativado_em IS NULL
   AND usuario_id IS NULL
   AND lower(email) <> 'eduardo.nonaka.gadm@saintpaul.edu.br';

COMMIT;

-- Verificação rápida do resultado -------------------------------------------
SELECT 'migrações aplicadas' AS item, count(*)::text AS valor FROM _migracoes
UNION ALL
SELECT 'grupos criados', count(*)::text FROM grupos
UNION ALL
SELECT 'pessoas autorizadas', count(*)::text FROM lista_acesso
UNION ALL
SELECT 'itens', count(*)::text FROM itens;
