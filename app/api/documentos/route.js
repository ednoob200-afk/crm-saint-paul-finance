/**
 * Recebimento de documentos: texto colado ou arquivo enviado.
 *
 * Nada é gravado no filesystem da função (efêmero na Vercel): arquivos vão
 * para o Blob Storage e o texto vai para o Postgres.
 */

import {
  exigirPapel,
  exigirSessao,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { criarDocumento, listarDocumentos } from '@/lib/repositories/documentos'
import { CONFIDENCIALIDADE } from '@/lib/quadros'
import { sanitizarTexto, triagemSchema } from '@/lib/validacao'
import {
  TAMANHO_MAXIMO,
  TIPOS_ACEITOS,
  guardarArquivo,
  nomeSeguro,
  storageConfigurado,
  validarArquivo,
} from '@/lib/storage'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TIPOS_TEXTUAIS = new Set(['text/plain', 'text/markdown', 'text/csv', 'application/json'])
const VALORES_CONFIDENCIALIDADE = CONFIDENCIALIDADE.map((c) => c.valor)

export async function GET() {
  try {
    const usuario = await exigirSessao()
    return ok({
      documentos: await listarDocumentos(usuario),
      storage: storageConfigurado(),
    })
  } catch (e) {
    return tratarErro(e, 'documentos GET')
  }
}

export async function POST(request) {
  try {
    verificarOrigem(request)
    const usuario = await exigirPapel('colaborador')

    const tipoConteudo = request.headers.get('content-type') || ''

    // ---------------------------------------------------------- texto colado
    if (tipoConteudo.includes('application/json')) {
      const corpo = await lerJson(request, 250_000)
      const validado = triagemSchema.safeParse(corpo)
      if (!validado.success) {
        return erroDeValidacao(
          validado.error.issues.map((i) => ({
            campo: i.path.join('.') || 'corpo',
            mensagem: i.message,
          })),
        )
      }

      const confidencialidade = VALORES_CONFIDENCIALIDADE.includes(corpo?.confidencialidade)
        ? corpo.confidencialidade
        : 'interno'

      const documento = await criarDocumento({
        nome: nomeSeguro(validado.data.nome),
        conteudoTexto: sanitizarTexto(validado.data.conteudo),
        tipoArquivo: 'text/plain',
        tamanho: Buffer.byteLength(validado.data.conteudo, 'utf8'),
        criadoPor: usuario.nome,
        confidencialidade,
      })

      await registrarAuditoria({
        usuario: usuario.email,
        papel: usuario.papel,
        acao: 'documento_recebido',
        recurso: `documentos/${documento.id}`,
        detalhe: `texto colado: ${documento.nome}`,
        ip: ipDaRequisicao(request),
      })

      return ok({ documento }, 201)
    }

    // --------------------------------------------------------- arquivo enviado
    if (tipoConteudo.includes('multipart/form-data')) {
      const declarado = Number(request.headers.get('content-length') || 0)
      if (declarado > TAMANHO_MAXIMO + 64 * 1024) {
        return erro(
          `Envio acima do limite de ${TAMANHO_MAXIMO / 1024 / 1024} MB.`,
          413,
        )
      }

      const formulario = await request.formData()
      const arquivo = formulario.get('arquivo')

      if (!arquivo || typeof arquivo === 'string') {
        return erro('Nenhum arquivo recebido no campo "arquivo".', 400)
      }

      const meta = validarArquivo({
        nome: arquivo.name,
        tipo: arquivo.type,
        tamanho: arquivo.size,
      })

      const confidencialidadeEnviada = formulario.get('confidencialidade')
      const confidencialidade = VALORES_CONFIDENCIALIDADE.includes(confidencialidadeEnviada)
        ? confidencialidadeEnviada
        : 'interno'

      const buffer = Buffer.from(await arquivo.arrayBuffer())

      // Arquivos textuais têm o conteúdo lido agora; PDF e imagem ficam no
      // Blob e são lidos pelo modelo na triagem.
      let conteudoTexto = null
      if (TIPOS_TEXTUAIS.has(meta.tipo)) {
        conteudoTexto = sanitizarTexto(buffer.toString('utf8').slice(0, 200_000))
        if (!conteudoTexto) {
          return erro('O arquivo de texto está vazio ou ilegível.', 400)
        }
      } else if (!storageConfigurado()) {
        return erro(
          'PDF e imagem exigem o Blob Storage configurado (BLOB_READ_WRITE_TOKEN), porque a ' +
            'função da Vercel não guarda arquivos. Configure o storage ou cole o texto do documento.',
          503,
          { codigo: 'storage_ausente' },
        )
      }

      let url = null
      if (storageConfigurado()) {
        const guardado = await guardarArquivo({
          nome: meta.nome,
          tipo: meta.tipo,
          conteudo: buffer,
        })
        url = guardado.url
      }

      const documento = await criarDocumento({
        nome: meta.nome,
        conteudoTexto,
        tipoArquivo: meta.tipo,
        tamanho: meta.tamanho,
        url,
        criadoPor: usuario.nome,
        confidencialidade,
      })

      await registrarAuditoria({
        usuario: usuario.email,
        papel: usuario.papel,
        acao: 'documento_recebido',
        recurso: `documentos/${documento.id}`,
        detalhe: `${meta.nome} (${meta.tipo}, ${meta.tamanho} bytes)`,
        ip: ipDaRequisicao(request),
      })

      return ok({ documento }, 201)
    }

    return erro(
      `Formato de envio não suportado. Use JSON com { nome, conteudo } ou multipart com o campo ` +
        `"arquivo". Tipos aceitos: ${Object.values(TIPOS_ACEITOS).join(', ')}.`,
      415,
    )
  } catch (e) {
    return tratarErro(e, 'documentos POST')
  }
}
