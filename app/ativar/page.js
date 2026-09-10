import { redirect } from 'next/navigation'
import Link from 'next/link'
import { sessaoAtual, segredoConfigurado } from '@/lib/auth'
import { bancoConfigurado } from '@/lib/db'
import { obterPorToken } from '@/lib/repositories/lista_acesso'
import { PAPEIS, rotuloDiretoria } from '@/lib/quadros'
import { LogoVertical } from '@/components/Marca'
import FormularioAtivacao from './FormularioAtivacao'

export const metadata = { title: 'Ativar acesso' }
export const dynamic = 'force-dynamic'

export default async function Ativar({ searchParams }) {
  const usuario = await sessaoAtual()
  if (usuario) redirect('/painel')

  const parametros = await searchParams
  const token = typeof parametros?.t === 'string' ? parametros.t : ''

  let convite = null
  let indisponivel = null

  if (!bancoConfigurado() || !segredoConfigurado()) {
    indisponivel = 'O sistema ainda não está configurado. Procure a Presidência.'
  } else if (!token) {
    indisponivel = 'Link incompleto. Use o link de convite recebido, por inteiro.'
  } else {
    try {
      convite = await obterPorToken(token)
    } catch (falha) {
      console.error('[ativar] convite:', falha.message)
      indisponivel = 'Não foi possível verificar o convite agora. Tente novamente em instantes.'
    }
  }

  const papel = convite ? PAPEIS.find((p) => p.valor === convite.papel) : null

  return (
    <main className="entrada">
      <div className="entrada__cartao">
        <div className="entrada__marca">
          <LogoVertical altura={100} />
          <h1 className="oculto-visual">Ativar acesso</h1>
        </div>

        {indisponivel && <div className="aviso aviso--erro">{indisponivel}</div>}

        {!indisponivel && !convite && (
          <>
            <div className="aviso aviso--erro">
              Este convite não é válido: pode ter expirado, já ter sido usado ou ter sido revogado.
            </div>
            <p className="entrada__nota">
              Peça um novo link à Presidência. Se você já tem acesso, use a{' '}
              <Link href="/entrar">tela de acesso</Link>.
            </p>
          </>
        )}

        {convite && (
          <>
            <div className="aviso aviso--ok">
              Convite válido para <strong>{convite.email}</strong>.
              <br />
              Papel: <strong>{papel ? papel.rotulo : convite.papel}</strong>
              {convite.diretoria && (
                <>
                  {' · '}
                  Diretoria: <strong>{rotuloDiretoria(convite.diretoria)}</strong>
                </>
              )}
            </div>

            {papel?.descricao && <p className="entrada__nota">{papel.descricao}</p>}

            <FormularioAtivacao token={token} email={convite.email} />
          </>
        )}

        <p className="entrada__nota">
          A senha que você definir é guardada apenas como hash e não é conhecida por ninguém, nem
          pela Presidência. Informações internas, contatos, candidatos e avaliações são
          confidenciais (Art. 96º e Art. 97º).
        </p>
      </div>
    </main>
  )
}
