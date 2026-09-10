/**
 * Armazenamento de arquivos. Nada é gravado no filesystem da função, que é
 * efêmero na Vercel: os arquivos vão para o Blob Storage.
 */

import { put, del } from '@vercel/blob'

export const TAMANHO_MAXIMO = 8 * 1024 * 1024 // 8 MB

export const TIPOS_ACEITOS = {
  'text/plain': '.txt',
  'text/markdown': '.md',
  'text/csv': '.csv',
  'application/json': '.json',
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

class ErroStorage extends Error {
  constructor(mensagem, status = 400, codigo = 'erro_storage') {
    super(mensagem)
    this.name = 'ErroStorage'
    this.status = status
    this.codigo = codigo
  }
}

export function storageConfigurado() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

/** Normaliza o nome do arquivo: sem caminho, sem caractere de controle. */
export function nomeSeguro(nome) {
  return String(nome || 'documento')
    .split(/[\\/]/)
    .pop()
    .replace(/[^\w\s.\-À-ÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'documento'
}

export function validarArquivo({ nome, tipo, tamanho }) {
  if (!TIPOS_ACEITOS[tipo]) {
    throw new ErroStorage(
      `Tipo de arquivo não aceito: ${tipo || 'desconhecido'}. ` +
        `Aceitos: ${Object.values(TIPOS_ACEITOS).join(', ')}.`,
      415,
      'tipo_nao_aceito',
    )
  }
  if (!Number.isFinite(tamanho) || tamanho <= 0) {
    throw new ErroStorage('Arquivo vazio.', 400, 'arquivo_vazio')
  }
  if (tamanho > TAMANHO_MAXIMO) {
    throw new ErroStorage(
      `Arquivo de ${(tamanho / 1024 / 1024).toFixed(1)} MB excede o limite de ` +
        `${TAMANHO_MAXIMO / 1024 / 1024} MB.`,
      413,
      'arquivo_grande',
    )
  }
  return { nome: nomeSeguro(nome), tipo, tamanho }
}

/**
 * Envia o arquivo ao Blob. O nome recebe prefixo aleatório para que a URL não
 * seja adivinhável a partir do nome do documento.
 */
export async function guardarArquivo({ nome, tipo, conteudo }) {
  if (!storageConfigurado()) {
    throw new ErroStorage(
      'O armazenamento de arquivos não está configurado: falta a variável BLOB_READ_WRITE_TOKEN. ' +
        'Crie um Blob Store na Vercel e conecte-o ao projeto. Enquanto isso, use "Colar texto".',
      503,
      'storage_ausente',
    )
  }
  const limpo = nomeSeguro(nome)
  const resultado = await put(`documentos/${limpo}`, conteudo, {
    access: 'public',
    contentType: tipo,
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
  return { url: resultado.url, pathname: resultado.pathname }
}

export async function removerArquivo(url) {
  if (!storageConfigurado() || !url) return false
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN })
    return true
  } catch (erro) {
    console.error('[storage] falha ao remover:', erro.message)
    return false
  }
}

export { ErroStorage }
