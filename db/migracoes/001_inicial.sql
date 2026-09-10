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
