import Link from 'next/link'
import { exigirSessao } from '@/lib/auth'
import { carregarIndicadores } from '@/lib/repositories/indicadores'
import { contarAguardandoRevisao } from '@/lib/repositories/documentos'
import { QUADROS, rotuloDiretoria } from '@/lib/quadros'
import { formatarData } from '@/lib/formato'
import Cabecalho from '@/components/Cabecalho'
import { DataPrazo, Pastilha, Pessoa, Vazio } from '@/components/Base'

export const metadata = { title: 'Visão executiva' }
export const dynamic = 'force-dynamic'

const NOME_QUADRO = Object.fromEntries(QUADROS.map((q) => [q.slug, q.nome]))

function Indicador({ rotulo, valor, nota, tom }) {
  const classe =
    tom === 'alerta' ? 'indicador indicador--alerta' : tom === 'atencao' ? 'indicador indicador--atencao' : 'indicador'
  return (
    <div className={classe}>
      <div className="indicador__rotulo">{rotulo}</div>
      <div className="indicador__valor">{valor}</div>
      {nota && <div className="indicador__nota">{nota}</div>}
    </div>
  )
}

export default async function Painel() {
  const usuario = await exigirSessao()

  let dados = null
  let aguardandoRevisao = 0
  let erro = null

  try {
    dados = await carregarIndicadores(usuario)
    aguardandoRevisao = await contarAguardandoRevisao(usuario)
  } catch (falha) {
    console.error('[painel] indicadores:', falha.message)
    erro =
      falha.code === '42P01'
        ? 'O banco ainda não foi migrado. Rode `npm run migrate` com a DATABASE_URL do ambiente.'
        : 'Não foi possível carregar os indicadores. Verifique a conexão com o banco de dados.'
  }

  if (erro) {
    return (
      <>
        <Cabecalho titulo="Visão executiva" />
        <main className="pagina">
          <div className="aviso aviso--erro">{erro}</div>
        </main>
      </>
    )
  }

  const { resumo, porDiretoria, riscos, blockers, proximos, atrasados, deliberacoes } = dados
  const sistemaVazio = resumo.total === 0

  const emPauta = deliberacoes.filter((d) => d.status === 'em_pauta' || d.status === 'em_deliberacao')
  const aguardandoExecucao = deliberacoes.filter(
    (d) => d.status === 'aprovada' || d.status === 'em_execucao',
  )

  return (
    <>
      <Cabecalho
        titulo="Visão executiva"
        descricao={`Cadência de gestão da Saint Paul Finance — ${usuario.nome}`}
      />

      <main className="pagina pilha">
        {sistemaVazio ? (
          <Vazio titulo="Nenhum dado registrado ainda">
            <p className="sem-margem">
              Os indicadores desta página vêm exclusivamente de dados reais dos quadros. Enquanto
              nada for cadastrado, nada é exibido — nenhum número de exemplo é apresentado como se
              fosse oficial.
            </p>
            <div className="barra-acoes">
              <Link className="botao botao--primario" href="/quadros/operacao">
                Começar pela Operação
              </Link>
              <Link className="botao" href="/documentos">
                Enviar um documento para triagem
              </Link>
            </div>
          </Vazio>
        ) : (
          <>
            <section className="grade grade--indicadores">
              <Indicador
                rotulo="Itens abertos"
                valor={resumo.abertos}
                nota={`${resumo.total} registros no total`}
              />
              <Indicador
                rotulo="Itens atrasados"
                valor={resumo.atrasados}
                tom={resumo.atrasados > 0 ? 'alerta' : undefined}
                nota="Prazo anterior a hoje"
              />
              <Indicador
                rotulo="Blockers ativos"
                valor={resumo.blockers}
                tom={resumo.blockers > 0 ? 'alerta' : undefined}
                nota="Art. 39º VII"
              />
              <Indicador
                rotulo="Riscos registrados"
                valor={resumo.riscos}
                tom={resumo.riscos > 0 ? 'atencao' : undefined}
                nota="Art. 63º §2º"
              />
              <Indicador
                rotulo="Contatos no CRM"
                valor={resumo.contatos_crm}
                nota="Art. 42º II"
              />
              <Indicador
                rotulo="Parcerias ativas"
                valor={resumo.parcerias_ativas}
                nota="Art. 104º"
              />
              <Indicador
                rotulo="Documentos aguardando revisão"
                valor={aguardandoRevisao}
                tom={aguardandoRevisao > 0 ? 'atencao' : undefined}
                nota="Revisão humana obrigatória (Art. 100º)"
              />
            </section>

            <section className="grade grade--2">
              <div className="cartao">
                <div className="cartao__titulo">
                  <h2>Carga por diretoria</h2>
                  <span className="terciario">Art. 45º §3º</span>
                </div>
                {porDiretoria.length === 0 ? (
                  <p className="terciario sem-margem">
                    Nenhum item possui diretoria atribuída.
                  </p>
                ) : (
                  <div className="rolagem-horizontal">
                    <table className="tabela-simples">
                      <thead>
                        <tr>
                          <th scope="col">Diretoria</th>
                          <th scope="col">Abertos</th>
                          <th scope="col">Atrasados</th>
                          <th scope="col">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porDiretoria.map((d) => (
                          <tr key={d.diretoria}>
                            <td>{rotuloDiretoria(d.diretoria)}</td>
                            <td className="mono">{d.abertos}</td>
                            <td className="mono">
                              {d.atrasados > 0 ? (
                                <span className="data data--vencida">{d.atrasados}</span>
                              ) : (
                                '0'
                              )}
                            </td>
                            <td className="mono">{d.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="cartao">
                <div className="cartao__titulo">
                  <h2>Próximos 21 dias</h2>
                  <span className="terciario">{proximos.length} item(ns)</span>
                </div>
                {proximos.length === 0 ? (
                  <p className="terciario sem-margem">
                    Nenhum prazo nos próximos 21 dias.
                  </p>
                ) : (
                  <div className="pilha--apertada">
                    {proximos.slice(0, 12).map((p) => (
                      <div className="entre pequeno" key={p.id}>
                        <span className="crescer quebra">
                          <Link href={`/quadros/${p.quadro}`}>{p.titulo}</Link>
                          <br />
                          <span className="terciario">{NOME_QUADRO[p.quadro] || p.quadro}</span>
                        </span>
                        <span className="linha">
                          <Pessoa nome={p.responsavel} />
                          <DataPrazo valor={p.prazo} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grade grade--2">
              <div className="cartao">
                <div className="cartao__titulo">
                  <h2>Blockers ativos</h2>
                  <span className="terciario">Art. 39º VI e VII</span>
                </div>
                {blockers.length === 0 ? (
                  <p className="terciario sem-margem">Nenhum blocker registrado.</p>
                ) : (
                  <div className="pilha--apertada">
                    {blockers.map((b) => (
                      <div key={b.id} className="pequeno">
                        <Link href={`/quadros/${b.quadro}`}>{b.titulo}</Link>
                        <div className="quebra secundario">{b.blocker}</div>
                        <div className="linha terciario">
                          <span>{rotuloDiretoria(b.diretoria)}</span>
                          <Pessoa nome={b.responsavel} />
                          <DataPrazo valor={b.prazo} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cartao">
                <div className="cartao__titulo">
                  <h2>Riscos críticos</h2>
                  <span className="terciario">Prioridade alta ou crítica</span>
                </div>
                {riscos.length === 0 ? (
                  <p className="terciario sem-margem">
                    Nenhum risco de prioridade alta ou crítica.
                  </p>
                ) : (
                  <div className="pilha--apertada">
                    {riscos.map((r) => (
                      <div key={r.id} className="pequeno">
                        <span className="linha">
                          <Pastilha cor={r.prioridade === 'critica' ? 'vermelho' : 'ambar'}>
                            {r.prioridade === 'critica' ? 'Crítica' : 'Alta'}
                          </Pastilha>
                          <Link href={`/quadros/${r.quadro}`}>{r.titulo}</Link>
                        </span>
                        <div className="quebra secundario">{r.risco}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grade grade--2">
              <div className="cartao">
                <div className="cartao__titulo">
                  <h2>Matérias em pauta</h2>
                  <span className="terciario">Art. 37º, Art. 65º</span>
                </div>
                {emPauta.length === 0 ? (
                  <p className="terciario sem-margem">Nenhuma matéria em pauta.</p>
                ) : (
                  <div className="rolagem-horizontal">
                    <table className="tabela-simples">
                      <thead>
                        <tr>
                          <th scope="col">Matéria</th>
                          <th scope="col">Instância</th>
                          <th scope="col">Quórum aplicável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emPauta.map((d) => (
                          <tr key={d.id}>
                            <td>
                              <Link href="/quadros/deliberacoes">{d.titulo}</Link>
                            </td>
                            <td>{d.instancia || '—'}</td>
                            <td className="pequeno">{d.quorum || 'Não informado'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="campo__ajuda" style={{ marginTop: '10px' }}>
                  A tabela completa de quóruns está em{' '}
                  <Link href="/estatuto">Consulta ao Estatuto</Link>.
                </p>
              </div>

              <div className="cartao">
                <div className="cartao__titulo">
                  <h2>Deliberações aguardando execução</h2>
                  <span className="terciario">Art. 67º</span>
                </div>
                {aguardandoExecucao.length === 0 ? (
                  <p className="terciario sem-margem">
                    Nenhuma deliberação aprovada aguardando execução.
                  </p>
                ) : (
                  <div className="pilha--apertada">
                    {aguardandoExecucao.map((d) => (
                      <div className="entre pequeno" key={d.id}>
                        <span className="crescer quebra">
                          <Link href="/quadros/deliberacoes">{d.titulo}</Link>
                        </span>
                        <span className="linha">
                          <Pessoa nome={d.responsavel} />
                          <DataPrazo valor={d.prazo} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {atrasados.length > 0 && (
              <section className="cartao">
                <div className="cartao__titulo">
                  <h2>Itens atrasados</h2>
                  <span className="terciario">{atrasados.length} item(ns)</span>
                </div>
                <div className="rolagem-horizontal">
                  <table className="tabela-simples">
                    <thead>
                      <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Quadro</th>
                        <th scope="col">Diretoria</th>
                        <th scope="col">Responsável</th>
                        <th scope="col">Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atrasados.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <Link href={`/quadros/${a.quadro}`}>{a.titulo}</Link>
                          </td>
                          <td>{NOME_QUADRO[a.quadro] || a.quadro}</td>
                          <td>{rotuloDiretoria(a.diretoria)}</td>
                          <td>{a.responsavel || '—'}</td>
                          <td>
                            <span className="data data--vencida">{formatarData(a.prazo)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}
