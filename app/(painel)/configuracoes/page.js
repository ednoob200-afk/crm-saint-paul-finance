import { exigirSessao, segredoConfigurado } from '@/lib/auth'
import { bancoConfigurado, primeira } from '@/lib/db'
import { chaveConfigurada, modeloEmUso } from '@/lib/ia'
import { storageConfigurado, TAMANHO_MAXIMO, TIPOS_ACEITOS } from '@/lib/storage'
import { ARTIGOS, CAPITULOS, VERSAO_ESTATUTO } from '@/lib/estatuto'
import { PAGINAS, QUADROS } from '@/lib/quadros'
import Cabecalho from '@/components/Cabecalho'
import { Artigo, Pastilha } from '@/components/Base'
import AlternarTema from '@/components/AlternarTema'

export const metadata = { title: 'Configurações do sistema' }
export const dynamic = 'force-dynamic'

const ROTAS = [
  { rota: '/', acesso: 'Redireciona conforme a sessão' },
  { rota: '/entrar', acesso: 'Pública' },
  { rota: '/api/saude', acesso: 'Pública, sem dados sensíveis' },
  { rota: '/api/auth/login', acesso: 'Pública, com limitação de tentativas' },
  { rota: '/painel', acesso: 'Sessão' },
  { rota: '/quadros/[slug]', acesso: 'Sessão' },
  { rota: '/estatuto', acesso: 'Sessão' },
  { rota: '/documentos', acesso: 'Sessão' },
  { rota: '/diretoria', acesso: 'Sessão; gestão de acessos exige Presidência' },
  { rota: '/configuracoes', acesso: 'Sessão' },
  { rota: '/api/quadros/[slug]/itens', acesso: 'GET: sessão · POST: Colaborador' },
  { rota: '/api/quadros/[slug]/grupos', acesso: 'GET: sessão · POST: Diretor' },
  { rota: '/api/itens/[id]', acesso: 'GET: sessão · PATCH: Colaborador · DELETE: Diretor' },
  { rota: '/api/itens/[id]/historico', acesso: 'Sessão, limitada à visibilidade do item' },
  { rota: '/api/documentos', acesso: 'GET: sessão · POST: Colaborador' },
  { rota: '/api/documentos/[id]/triagem', acesso: 'Colaborador' },
  { rota: '/api/documentos/[id]/aprovar', acesso: 'Diretor' },
  { rota: '/api/estatuto/pergunta', acesso: 'Sessão' },
  { rota: '/api/usuarios', acesso: 'Presidência' },
  { rota: '/api/pessoas', acesso: 'Sessão' },
]

function Situacao({ ok, rotuloOk = 'Configurado', rotuloFalta = 'Ausente' }) {
  return <Pastilha cor={ok ? 'verde' : 'vermelho'}>{ok ? rotuloOk : rotuloFalta}</Pastilha>
}

export default async function PaginaConfiguracoes() {
  const usuario = await exigirSessao()

  let banco = { conectado: false, migrado: false, migracoes: null }
  if (bancoConfigurado()) {
    try {
      const linha = await primeira(
        `SELECT to_regclass('public.itens') IS NOT NULL AS migrado`,
      )
      banco = { ...banco, conectado: true, migrado: Boolean(linha?.migrado) }
    } catch (falha) {
      console.error('[configuracoes] banco:', falha.message)
    }
    // Consulta separada: a tabela de controle pode ainda não existir, e isso
    // não deve mascarar o fato de que a conexão funciona.
    if (banco.migrado) {
      try {
        const contagem = await primeira('SELECT count(*)::int AS total FROM _migracoes')
        banco.migracoes = contagem?.total ?? null
      } catch {
        banco.migracoes = null
      }
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Configurações do sistema"
        descricao="Integrações, saúde da implantação e informações técnicas."
      >
        <Artigo rotulo="Art. 118º" />
      </Cabecalho>

      <main className="pagina pilha">
        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Aparência</h2>
          </div>
          <div style={{ maxWidth: '240px' }}>
            <AlternarTema />
          </div>
          <p className="campo__ajuda" style={{ marginTop: '8px' }}>
            A preferência de tema fica neste navegador e é reaplicada antes da primeira pintura.
            Nenhum dado institucional depende dela.
          </p>
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Integrações</h2>
            <span className="terciario">Verificado no servidor</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Dependência</th>
                  <th scope="col">Variável</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Sem ela</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PostgreSQL</td>
                  <td className="mono pequeno">DATABASE_URL</td>
                  <td>
                    <Situacao ok={bancoConfigurado()} />
                  </td>
                  <td className="pequeno">O sistema não funciona: é a persistência oficial.</td>
                </tr>
                <tr>
                  <td>Sessões</td>
                  <td className="mono pequeno">AUTH_SECRET</td>
                  <td>
                    <Situacao ok={segredoConfigurado()} />
                  </td>
                  <td className="pequeno">O login fica indisponível.</td>
                </tr>
                <tr>
                  <td>IA</td>
                  <td className="mono pequeno">ANTHROPIC_API_KEY</td>
                  <td>
                    <Situacao ok={chaveConfigurada()} />
                  </td>
                  <td className="pequeno">
                    Triagem e consulta por IA respondem erro legível; o cadastro manual continua.
                  </td>
                </tr>
                <tr>
                  <td>Storage</td>
                  <td className="mono pequeno">BLOB_READ_WRITE_TOKEN</td>
                  <td>
                    <Situacao ok={storageConfigurado()} />
                  </td>
                  <td className="pequeno">
                    PDF e imagem não podem ser enviados; “Colar texto” continua disponível.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="campo__ajuda" style={{ marginTop: '10px' }}>
            Esta página mostra apenas se cada variável existe. Nenhum valor de chave, senha ou string
            de conexão é exibido, registrado em log ou enviado ao navegador.
          </p>
        </section>

        <section className="grade grade--2">
          <div className="cartao">
            <div className="cartao__titulo">
              <h2>Banco de dados</h2>
            </div>
            <table className="tabela-simples">
              <tbody>
                <tr>
                  <th scope="row">Conexão</th>
                  <td>
                    <Situacao ok={banco.conectado} rotuloOk="Conectado" rotuloFalta="Sem conexão" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Esquema</th>
                  <td>
                    <Situacao ok={banco.migrado} rotuloOk="Migrado" rotuloFalta="Migração pendente" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Migrações aplicadas</th>
                  <td className="mono">{banco.migracoes ?? '—'}</td>
                </tr>
              </tbody>
            </table>
            {!banco.migrado && banco.conectado && (
              <p className="aviso aviso--atencao" style={{ marginTop: '10px' }}>
                Rode <code>npm run migrate</code> com a <code>DATABASE_URL</code> do ambiente. As
                migrações são aditivas e não apagam dados existentes.
              </p>
            )}
          </div>

          <div className="cartao">
            <div className="cartao__titulo">
              <h2>Base institucional</h2>
            </div>
            <table className="tabela-simples">
              <tbody>
                <tr>
                  <th scope="row">Estatuto vigente</th>
                  <td>{VERSAO_ESTATUTO}</td>
                </tr>
                <tr>
                  <th scope="row">Artigos indexados</th>
                  <td className="mono">{ARTIGOS.length}</td>
                </tr>
                <tr>
                  <th scope="row">Capítulos</th>
                  <td className="mono">{CAPITULOS.length}</td>
                </tr>
                <tr>
                  <th scope="row">Itens de menu</th>
                  <td className="mono">{QUADROS.length + PAGINAS.length}</td>
                </tr>
                <tr>
                  <th scope="row">Quadros de dados</th>
                  <td className="mono">{QUADROS.length}</td>
                </tr>
                <tr>
                  <th scope="row">Modelo de IA</th>
                  <td className="mono">{chaveConfigurada() ? modeloEmUso() : '—'}</td>
                </tr>
                <tr>
                  <th scope="row">Limite de upload</th>
                  <td className="mono">{TAMANHO_MAXIMO / 1024 / 1024} MB</td>
                </tr>
                <tr>
                  <th scope="row">Tipos aceitos</th>
                  <td className="mono pequeno">{Object.values(TIPOS_ACEITOS).join(' ')}</td>
                </tr>
                <tr>
                  <th scope="row">Sua sessão</th>
                  <td className="pequeno">
                    {usuario.nome} · {usuario.papel}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Rotas e níveis de acesso</h2>
            <span className="terciario">{ROTAS.length} rotas</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Rota</th>
                  <th scope="col">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {ROTAS.map((r) => (
                  <tr key={r.rota}>
                    <td className="mono pequeno">{r.rota}</td>
                    <td className="pequeno">{r.acesso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="campo__ajuda" style={{ marginTop: '10px' }}>
            Toda mutação verifica sessão, papel e origem da requisição no servidor. A visibilidade por
            confidencialidade é aplicada na consulta ao banco, e não na interface (Art. 96º, Art. 97º §1º).
          </p>
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Saúde</h2>
          </div>
          <p className="sem-margem">
            A rota de verificação é <code>/api/saude</code>. Ela informa se cada dependência está
            configurada e se o banco responde, sem revelar valor algum.
          </p>
        </section>
      </main>
    </>
  )
}
