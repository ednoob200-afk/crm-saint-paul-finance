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
