import { redirect } from 'next/navigation'
import { sessaoAtual } from '@/lib/auth'

// Depende do cookie de sessão: não pode ser pré-renderizado.
export const dynamic = 'force-dynamic'

export default async function Raiz() {
  const usuario = await sessaoAtual()
  redirect(usuario ? '/painel' : '/entrar')
}
