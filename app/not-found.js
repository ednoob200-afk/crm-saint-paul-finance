import Link from 'next/link'
import { LogoVertical } from '@/components/Marca'

export const metadata = { title: 'Página não encontrada' }

export default function NaoEncontrado() {
  return (
    <main className="entrada">
      <div className="entrada__cartao">
        <div className="entrada__marca">
          <LogoVertical altura={92} />
          <h1>Página não encontrada</h1>
        </div>
        <p className="sem-margem">
          O endereço acessado não corresponde a nenhum quadro ou página do sistema.
        </p>
        <Link className="botao botao--primario" href="/painel">
          Ir para a visão executiva
        </Link>
      </div>
    </main>
  )
}
