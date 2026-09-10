import Link from 'next/link'

export const metadata = { title: 'Página não encontrada' }

export default function NaoEncontrado() {
  return (
    <main className="entrada">
      <div className="entrada__cartao">
        <div className="entrada__marca">
          <span className="entrada__sigla" aria-hidden="true">
            SPF
          </span>
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
