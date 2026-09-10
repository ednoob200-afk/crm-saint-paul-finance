import { z } from 'zod'
import {
  exigirPapel,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { adicionarVarios, listar } from '@/lib/repositories/lista_acesso'
import { separarEmails } from '@/lib/emails'
import { DIRETORIAS, NIVEL_PAPEL, PAPEIS } from '@/lib/quadros'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

const MAXIMO_POR_VEZ = 50

const entradaSchema = z.object({
  emails: z.string().trim().min(3, 'Informe ao menos um e-mail.').max(6000),
  papel: z.enum(PAPEIS.map((p) => p.valor)),
  primeiroAcessoLivre: z.boolean().optional().default(true),
  diretoria: z
    .enum(DIRETORIAS.map((d) => d.valor))
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  observacao: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
})

export async function GET() {
  try {
    await exigirPapel('presidencia')
    return ok({ entradas: await listar() })
  } catch (e) {
    return tratarErro(e, 'lista-acesso GET')
  }
}

export async function POST(request) {
  try {
    verificarOrigem(request)
    const usuario = await exigirPapel('presidencia')

    const corpo = await lerJson(request, 30_000)
    const validado = entradaSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }

    // Ninguém autoriza papel acima do próprio.
    const nivelAtual = NIVEL_PAPEL[usuario.papel] || 0
    if ((NIVEL_PAPEL[validado.data.papel] || 0) > nivelAtual) {
      return erro('Você não pode conceder um papel acima do seu.', 403)
    }

    const { validos, invalidos } = separarEmails(validado.data.emails)

    if (validos.length === 0) {
      return erroDeValidacao([
        {
          campo: 'emails',
          mensagem:
            invalidos.length > 0
              ? `Nenhum e-mail válido. Verifique: ${invalidos.slice(0, 5).join(', ')}.`
              : 'Nenhum e-mail válido informado.',
        },
      ])
    }
    if (validos.length > MAXIMO_POR_VEZ) {
      return erro(
        `Adicione no máximo ${MAXIMO_POR_VEZ} e-mails por vez. Foram informados ${validos.length}.`,
        422,
      )
    }

    const { criados, jaExistiam } = await adicionarVarios(validos, {
      papel: validado.data.papel,
      diretoria: validado.data.diretoria || null,
      observacao: validado.data.observacao,
      criadoPor: usuario.nome,
      primeiroAcessoLivre: validado.data.primeiroAcessoLivre,
    })

    // A URL vem do host da própria requisição, e não de dado do corpo.
    const origem =
      request.headers.get('origin') ||
      (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') ||
      `https://${request.headers.get('host') || ''}`

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'lista_acesso_adicionada',
      recurso: 'lista_acesso',
      detalhe: `${criados.length} adicionado(s) como ${validado.data.papel}; ${jaExistiam.length} já existia(m)`,
      ip: ipDaRequisicao(request),
    })

    return ok(
      {
        criados,
        jaExistiam,
        invalidos,
        // Endereço que a Presidência divulga: a pessoa cria a própria senha lá.
        urlPrimeiroAcesso: `${origem}/entrar`,
        entradas: await listar(),
      },
      201,
    )
  } catch (e) {
    return tratarErro(e, 'lista-acesso POST')
  }
}
