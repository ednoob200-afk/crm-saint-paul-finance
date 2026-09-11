import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { MIGRACOES } from '@/lib/migracoes'

const diretorio = resolve(process.cwd(), 'db/migracoes')

function arquivosDeMigracao() {
  return readdirSync(diretorio)
    .filter((n) => n.endsWith('.sql'))
    .sort()
}

describe('migrações empacotadas', () => {
  it('cobre todos os arquivos de db/migracoes, na mesma ordem', () => {
    expect(MIGRACOES.map((m) => m.nome)).toEqual(arquivosDeMigracao())
  })

  it('o SQL empacotado é idêntico ao arquivo de origem', () => {
    for (const migracao of MIGRACOES) {
      const original = readFileSync(resolve(diretorio, migracao.nome), 'utf8')
      expect(migracao.sql, `${migracao.nome} divergiu do arquivo`).toBe(original)
    }
  })

  it('o hash é o mesmo que o migrate calcularia', () => {
    for (const migracao of MIGRACOES) {
      const original = readFileSync(resolve(diretorio, migracao.nome), 'utf8')
      const esperado = createHash('sha256').update(original).digest('hex').slice(0, 16)
      expect(migracao.hash, `${migracao.nome} com hash divergente`).toBe(esperado)
    }
  })

  it('não há nome repetido', () => {
    const nomes = MIGRACOES.map((m) => m.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('toda migração tem conteúdo', () => {
    for (const migracao of MIGRACOES) {
      expect(migracao.sql.trim().length, `${migracao.nome} está vazia`).toBeGreaterThan(0)
    }
  })

  it('nenhuma migração apaga tabela ou coluna', () => {
    // Migrações são aditivas: o Art. 42º VIII e o Art. 72º parágrafo único
    // exigem preservar a memória institucional.
    const destrutivo = /\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE)\b/i
    for (const migracao of MIGRACOES) {
      expect(destrutivo.test(migracao.sql), `${migracao.nome} contém comando destrutivo`).toBe(
        false,
      )
    }
  })
})
