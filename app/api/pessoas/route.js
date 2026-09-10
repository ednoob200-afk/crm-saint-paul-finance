/**
 * Nomes disponíveis para preencher seletores de responsável.
 * Retorna apenas nomes, nunca e-mails ou dados de contato.
 */

import { exigirSessao } from '@/lib/auth'
import { nomesDisponiveis } from '@/lib/repositories/usuarios'
import { ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await exigirSessao()
    return ok({ pessoas: await nomesDisponiveis() })
  } catch (e) {
    return tratarErro(e, 'pessoas GET')
  }
}
