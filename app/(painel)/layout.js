import { redirect } from 'next/navigation'
import { sessaoAtual } from '@/lib/auth'
import { VERSAO_ESTATUTO } from '@/lib/estatuto'
import BarraLateral from '@/components/BarraLateral'

export const dynamic = 'force-dynamic'

export default async function LayoutPainel({ children }) {
  const usuario = await sessaoAtual()
  if (!usuario) redirect('/entrar')

  return (
    <div className="aplicacao">
      <BarraLateral usuario={usuario} versaoEstatuto={VERSAO_ESTATUTO} />
      <div className="conteudo">{children}</div>
    </div>
  )
}
