import { exigirSessao, listarAuditoria } from '@/lib/auth'
import { listarUsuarios } from '@/lib/repositories/usuarios'
import {
  DIRETORIAS,
  DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS,
  PAPEIS,
  podeAdministrar,
} from '@/lib/quadros'
import { formatarDataHora } from '@/lib/formato'
import Cabecalho from '@/components/Cabecalho'
import { Artigo, Pastilha } from '@/components/Base'
import { listar as listarListaAcesso } from '@/lib/repositories/lista_acesso'
import GestaoUsuarios from '@/components/diretoria/GestaoUsuarios'
import ListaAcesso from '@/components/diretoria/ListaAcesso'

export const metadata = { title: 'Diretoria e permissões' }
export const dynamic = 'force-dynamic'

export default async function PaginaDiretoria() {
  const usuario = await exigirSessao()
  const gestor = podeAdministrar(usuario.papel)

  let usuarios = []
  let auditoria = []
  let entradasDeAcesso = []
  let erro = null

  if (gestor) {
    try {
      usuarios = await listarUsuarios()
      entradasDeAcesso = await listarListaAcesso()
      auditoria = await listarAuditoria(80)
    } catch (falha) {
      console.error('[diretoria]', falha.message)
      erro =
        falha.code === '42P01'
          ? 'O banco ainda não foi migrado. Rode `npm run migrate` com a DATABASE_URL do ambiente.'
          : 'Não foi possível carregar usuários e auditoria.'
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Diretoria e permissões"
        descricao="Estrutura da Diretoria Executiva, papéis de acesso e trilha de auditoria."
      >
        <Artigo rotulo="Art. 33º" />
        <Artigo rotulo="Art. 45º" />
        <Artigo rotulo="Art. 97º" />
      </Cabecalho>

      <main className="pagina pilha">
        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Diretorias</h2>
            <span className="terciario">Art. 33º</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Diretoria</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Base</th>
                </tr>
              </thead>
              <tbody>
                {DIRETORIAS.map((d) => (
                  <tr key={d.valor}>
                    <td>{d.rotulo}</td>
                    <td>
                      <Pastilha cor="verde">Instituída</Pastilha>
                    </td>
                    <td>
                      <Artigo rotulo={d.artigo} />
                    </td>
                  </tr>
                ))}
                {DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS.map((d) => (
                  <tr key={d.valor}>
                    <td>{d.rotulo}</td>
                    <td>
                      <Pastilha cor="cinza">{d.situacao}</Pastilha>
                    </td>
                    <td>
                      <span className="linha">
                        <Artigo rotulo="Art. 33º" />
                        <Artigo rotulo="Art. 44º" />
                      </span>
                      <div className="pequeno secundario" style={{ marginTop: '4px' }}>
                        {d.observacao}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Papéis de acesso</h2>
            <span className="terciario">Art. 45º</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Papel</th>
                  <th scope="col">Permissões</th>
                  <th scope="col">Base</th>
                </tr>
              </thead>
              <tbody>
                {PAPEIS.map((p) => (
                  <tr key={p.valor}>
                    <td>{p.rotulo}</td>
                    <td>{p.descricao}</td>
                    <td>{p.artigo ? <Artigo rotulo={p.artigo} /> : <span className="terciario">Técnico</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="campo__ajuda" style={{ marginTop: '10px' }}>
            Nenhum usuário pode conceder a si mesmo um papel superior, nem criar papel acima do
            próprio. A verificação acontece no servidor, em toda mutação.
          </p>
        </section>

        {!gestor ? (
          <section className="cartao">
            <div className="cartao__titulo">
              <h2>Gestão de acessos</h2>
            </div>
            <p className="sem-margem">
              A gestão de usuários é restrita à Presidência e ao administrador do sistema. Seu papel
              atual é{' '}
              <strong>{PAPEIS.find((p) => p.valor === usuario.papel)?.rotulo || usuario.papel}</strong>.
            </p>
          </section>
        ) : erro ? (
          <div className="aviso aviso--erro">{erro}</div>
        ) : (
          <>
            <ListaAcesso
              entradasIniciais={entradasDeAcesso}
              papelAtual={usuario.papel}
              emailAtual={usuario.email}
            />

            <details className="cartao">
              <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
                Criar acesso definindo a senha você mesmo
                <span className="terciario pequeno">
                  {' '}
                  — caminho alternativo, quando a pessoa não pode criar a própria senha
                </span>
              </summary>
              <p className="campo__ajuda" style={{ marginTop: '10px' }}>
                Prefira a lista de acesso acima: assim ninguém precisa transmitir senha e a
                Presidência não conhece a senha de outra pessoa. Use este caminho apenas em
                exceção, entregando a senha por canal seguro e pedindo a troca depois.
              </p>
              <div style={{ marginTop: '12px' }}>
                <GestaoUsuarios
                  usuariosIniciais={usuarios}
                  papelAtual={usuario.papel}
                  idAtual={usuario.id}
                />
              </div>
            </details>

            <section className="cartao">
              <div className="cartao__titulo">
                <h2>Trilha de auditoria</h2>
                <span className="terciario">Últimos {auditoria.length} eventos</span>
              </div>
              {auditoria.length === 0 ? (
                <p className="terciario sem-margem">Nenhum evento registrado.</p>
              ) : (
                <div className="rolagem-horizontal">
                  <table className="tabela-simples">
                    <thead>
                      <tr>
                        <th scope="col">Quando</th>
                        <th scope="col">Usuário</th>
                        <th scope="col">Ação</th>
                        <th scope="col">Recurso</th>
                        <th scope="col">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditoria.map((a, i) => (
                        <tr key={i}>
                          <td className="mono pequeno">{formatarDataHora(a.criado_em)}</td>
                          <td className="pequeno quebra">{a.usuario || '—'}</td>
                          <td className="pequeno mono">{a.acao}</td>
                          <td className="pequeno mono quebra">{a.recurso || '—'}</td>
                          <td className="pequeno quebra">{a.detalhe || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="campo__ajuda" style={{ marginTop: '10px' }}>
                A trilha nunca registra senhas, tokens ou chaves de API.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  )
}
