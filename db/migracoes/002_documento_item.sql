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
