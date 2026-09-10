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
