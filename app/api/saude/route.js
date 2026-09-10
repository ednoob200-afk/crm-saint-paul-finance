/**
 * Rota de saúde. Pública, mas não revela segredo algum: informa apenas se
 * cada dependência está configurada e se o banco responde.
 */

import { bancoConfigurado, primeira } from '@/lib/db'
import { segredoConfigurado } from '@/lib/auth'
import { chaveConfigurada, modeloEmUso } from '@/lib/ia'
import { storageConfigurado } from '@/lib/storage'
import { VERSAO_ESTATUTO, ARTIGOS } from '@/lib/estatuto'
import { QUADROS, PAGINAS } from '@/lib/quadros'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dependencias = {
    banco: bancoConfigurado() ? 'configurado' : 'ausente',
    sessoes: segredoConfigurado() ? 'configurado' : 'ausente',
    ia: chaveConfigurada() ? 'configurado' : 'ausente',
    storage: storageConfigurado() ? 'configurado' : 'ausente',
  }

  let banco = { conectado: false, migrado: false }
  if (bancoConfigurado()) {
    try {
      const linha = await primeira(
        `SELECT to_regclass('public.itens') IS NOT NULL AS migrado`,
      )
      banco = { conectado: true, migrado: Boolean(linha?.migrado) }
    } catch (erro) {
      console.error('[saude] banco:', erro.message)
      banco = { conectado: false, migrado: false }
    }
  }

  const pronto = banco.conectado && banco.migrado && dependencias.sessoes === 'configurado'

  return Response.json(
    {
      situacao: pronto ? 'ok' : 'incompleto',
      dependencias,
      banco,
      estatuto: { versao: VERSAO_ESTATUTO, artigos: ARTIGOS.length },
      modeloIa: chaveConfigurada() ? modeloEmUso() : null,
      itensDeMenu: QUADROS.length + PAGINAS.length,
      quadrosDeDados: QUADROS.length,
      verificadoEm: new Date().toISOString(),
    },
    { status: pronto ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
