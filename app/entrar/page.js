import { redirect } from 'next/navigation'
import { sessaoAtual, segredoConfigurado } from '@/lib/auth'
import { bancoConfigurado } from '@/lib/db'
import { contarUsuarios } from '@/lib/repositories/usuarios'
import { VERSAO_ESTATUTO } from '@/lib/estatuto'
import FormularioEntrada from './FormularioEntrada'

export const metadata = { title: 'Acesso' }
export const dynamic = 'force-dynamic'

export default async function Entrar() {
  const usuario = await sessaoAtual()
  if (usuario) redirect('/painel')

  const semBanco = !bancoConfigurado()
  const semSegredo = !segredoConfigurado()

  let semUsuarios = false
  let erroBanco = null
  if (!semBanco) {
    try {
      semUsuarios = (await contarUsuarios()) === 0
    } catch (erro) {
      erroBanco = erro?.code === '42P01' ? 'migracao' : 'conexao'
    }
  }

  return (
    <main className="entrada">
      <div className="entrada__cartao">
        <div className="entrada__marca">
          <span className="entrada__sigla" aria-hidden="true">
            SPF
          </span>
          <h1>Saint Paul Finance</h1>
          <p className="terciario sem-margem">
            Liga de Mercado Financeiro da Escola de Negócios Saint Paul
          </p>
        </div>

        {semBanco && (
          <div className="aviso aviso--erro">
            <strong>Banco de dados não configurado.</strong> Defina a variável{' '}
            <code>DATABASE_URL</code> no ambiente e reimplante. O acesso permanece
            indisponível até então.
          </div>
        )}

        {!semBanco && semSegredo && (
          <div className="aviso aviso--erro">
            <strong>Sessões não configuradas.</strong> Defina a variável{' '}
            <code>AUTH_SECRET</code> com pelo menos 24 caracteres.
          </div>
        )}

        {erroBanco === 'migracao' && (
          <div className="aviso aviso--erro">
            <strong>Banco ainda não migrado.</strong> Rode <code>npm run migrate</code> com a{' '}
            <code>DATABASE_URL</code> do ambiente.
          </div>
        )}

        {erroBanco === 'conexao' && (
          <div className="aviso aviso--erro">
            <strong>Sem conexão com o banco.</strong> Verifique a{' '}
            <code>DATABASE_URL</code> e as regras de rede do provedor.
          </div>
        )}

        {!semBanco && !erroBanco && semUsuarios && (
          <div className="aviso aviso--atencao">
            <strong>Nenhum usuário cadastrado.</strong> Rode <code>npm run seed</code> com{' '}
            <code>ADMIN_EMAIL</code> e <code>ADMIN_PASSWORD_HASH</code> definidos para criar o
            primeiro acesso administrativo.
          </div>
        )}

        <FormularioEntrada bloqueado={semBanco || semSegredo || Boolean(erroBanco)} />

        <p className="entrada__nota">
          Sistema institucional de uso interno. Contatos, candidatos e avaliações são
          informações confidenciais (Art. 96º e Art. 97º).
          <br />
          Estatuto vigente: {VERSAO_ESTATUTO}.
        </p>
      </div>
    </main>
  )
}
