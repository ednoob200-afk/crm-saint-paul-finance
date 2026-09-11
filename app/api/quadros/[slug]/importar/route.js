/**
 * Importação em lote de planilha colada.
 *
 * Dois passos, sempre: o primeiro devolve a leitura para conferência, o
 * segundo grava. Nada entra no quadro sem alguém ter visto o que seria criado
 * — a mesma exigência de revisão humana da triagem por IA.
 */

import { z } from 'zod'
import {
  exigirPapel,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { obterQuadro } from '@/lib/quadros'
import { prepararImportacao, LIMITE_LINHAS } from '@/lib/importacao'
import { criarItem } from '@/lib/repositories/itens'
import { garantirGruposPadrao } from '@/lib/repositories/grupos'
import { validarItem } from '@/lib/validacao'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const corpoSchema = z.object({
  texto: z.string().min(5, 'Cole o conteúdo da planilha.').max(400_000),
  confirmar: z.boolean().optional().default(false),
  // Linhas que a pessoa desmarcou na conferência.
  ignorar: z.array(z.number().int().min(1)).max(LIMITE_LINHAS).optional().default([]),
})

export async function POST(request, { params }) {
  try {
    verificarOrigem(request)
    const { slug } = await params

    // Criar muitos itens de uma vez é ato de gestão: exige Diretor.
    const usuario = await exigirPapel('diretor')

    const quadro = obterQuadro(slug)
    if (!quadro) return erro('Quadro inexistente.', 404)

    const corpo = await lerJson(request, 500_000)
    const validado = corpoSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }

    const leitura = prepararImportacao(slug, validado.data.texto)
    if (!leitura.ok) {
      return erro(leitura.erro, 422, { colunasLidas: leitura.colunasLidas })
    }

    // --------------------------------------------------------- conferência
    if (!validado.data.confirmar) {
      return ok({
        conferencia: true,
        quadro: slug,
        colunasReconhecidas: leitura.colunasReconhecidas,
        colunasIgnoradas: leitura.colunasIgnoradas,
        delimitador: leitura.delimitador,
        total: leitura.total,
        comAviso: leitura.comAviso,
        itens: leitura.itens,
      })
    }

    // ------------------------------------------------------------- gravação
    const ignorar = new Set(validado.data.ignorar)
    const grupos = await garantirGruposPadrao(slug)
    const grupoPorNome = new Map(grupos.map((g) => [g.nome, g.id]))

    const criados = []
    const recusados = []

    for (const { linha, item } of leitura.itens) {
      if (ignorar.has(linha)) continue

      const { __grupo: nomeDoGrupo, ...bruto } = item
      const resultado = validarItem(slug, bruto)

      if (!resultado.ok) {
        recusados.push({
          linha,
          titulo: item.titulo,
          erros: resultado.erros.map((e) => `${e.campo}: ${e.mensagem}`),
        })
        continue
      }

      try {
        const criado = await criarItem(
          slug,
          { ...resultado.valor, grupo_id: grupoPorNome.get(nomeDoGrupo) || null },
          usuario,
        )
        criados.push({ linha, id: criado.id, titulo: criado.titulo })
      } catch (falha) {
        console.error('[importar] linha', linha, falha.message)
        recusados.push({ linha, titulo: item.titulo, erros: ['Não foi possível gravar esta linha.'] })
      }
    }

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'importacao_em_lote',
      recurso: slug,
      detalhe: `${criados.length} criado(s), ${recusados.length} recusado(s), ${ignorar.size} ignorado(s)`,
      ip: ipDaRequisicao(request),
    })

    return ok(
      {
        conferencia: false,
        quadro: slug,
        criados,
        recusados,
        ignorados: ignorar.size,
      },
      201,
    )
  } catch (e) {
    return tratarErro(e, 'quadros/importar')
  }
}
