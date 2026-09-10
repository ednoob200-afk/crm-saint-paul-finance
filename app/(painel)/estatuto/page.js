import Link from 'next/link'
import { exigirSessao } from '@/lib/auth'
import {
  ARTIGOS,
  CAPITULOS,
  VERSAO_ESTATUTO,
  buscarArtigos,
  obterArtigo,
} from '@/lib/estatuto'
import {
  DIREITOS_DE_DECISAO,
  DIRETORIAS,
  DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS,
  QUADROS,
  QUORUNS,
} from '@/lib/quadros'
import Cabecalho from '@/components/Cabecalho'
import { Artigo, Citacao } from '@/components/Base'
import PerguntaEstatuto from '@/components/estatuto/PerguntaEstatuto'

export const metadata = { title: 'Consulta ao Estatuto' }
export const dynamic = 'force-dynamic'

/** Quadros que declaram cada artigo como base, para ligar artigo e quadro. */
function quadrosPorArtigo(rotulo) {
  const numero = String(rotulo).match(/(\d{1,3})/)?.[1]
  if (!numero) return []
  return QUADROS.filter((q) =>
    (q.artigos || []).some((a) => String(a).match(/(\d{1,3})/)?.[1] === numero),
  )
}

export default async function PaginaEstatuto({ searchParams }) {
  await exigirSessao()

  const parametros = await searchParams
  const consulta = (parametros?.busca || '').toString().slice(0, 120)
  const artigoPedido = parametros?.artigo ? obterArtigo(Number(parametros.artigo)) : null

  const resultados = consulta ? buscarArtigos(consulta, 40) : []

  return (
    <>
      <Cabecalho
        titulo="Consulta ao Estatuto"
        descricao={`Estatuto Oficial vigente — ${VERSAO_ESTATUTO} · ${ARTIGOS.length} artigos em ${CAPITULOS.length} capítulos`}
      />

      <main className="pagina pilha">
        {artigoPedido && (
          <section className="cartao">
            <div className="cartao__titulo">
              <h2>{artigoPedido.rotulo}</h2>
              <span className="terciario mono">
                Capítulo {artigoPedido.capitulo}
              </span>
            </div>
            <Citacao rotulo={`${artigoPedido.rotulo} — ${artigoPedido.capituloTitulo}`}>
              {artigoPedido.texto}
            </Citacao>
            {quadrosPorArtigo(artigoPedido.rotulo).length > 0 && (
              <p className="pequeno" style={{ marginTop: '10px' }}>
                Quadros fundamentados neste artigo:{' '}
                {quadrosPorArtigo(artigoPedido.rotulo).map((q, i) => (
                  <span key={q.slug}>
                    {i > 0 && ', '}
                    <Link href={`/quadros/${q.slug}`}>{q.nome}</Link>
                  </span>
                ))}
              </p>
            )}
          </section>
        )}

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Pergunta em linguagem natural</h2>
            <span className="terciario">Art. 100º, Art. 108º</span>
          </div>
          <PerguntaEstatuto />
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Busca de artigos</h2>
            <span className="terciario">Busca literal no texto do Estatuto</span>
          </div>

          <form method="get" className="filtros" style={{ marginBottom: 0 }}>
            <div className="campo filtros__busca">
              <label className="campo__rotulo" htmlFor="busca">
                Termo, número do artigo ou capítulo
              </label>
              <input
                id="busca"
                name="busca"
                type="search"
                defaultValue={consulta}
                placeholder="quórum, parceria, Art. 42, capítulo XI…"
              />
            </div>
            <button type="submit" className="botao botao--primario">
              Buscar
            </button>
            {consulta && (
              <Link className="botao botao--discreto" href="/estatuto">
                Limpar
              </Link>
            )}
          </form>

          {consulta && (
            <div className="pilha" style={{ marginTop: '14px' }}>
              <p className="terciario sem-margem">
                {resultados.length === 0
                  ? 'Nenhum artigo encontrado para este termo.'
                  : `${resultados.length} artigo(s) encontrado(s).`}
              </p>
              <div className="artigo-lista">
                {resultados.map((a) => (
                  <Citacao key={a.numero} rotulo={`${a.rotulo} — Capítulo ${a.capitulo}, ${a.capituloTitulo}`}>
                    {a.texto}
                  </Citacao>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Quem decide o quê</h2>
            <span className="terciario">Art. 45º, Art. 120º</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Matéria</th>
                  <th scope="col">Quem decide</th>
                  <th scope="col">Base</th>
                </tr>
              </thead>
              <tbody>
                {DIREITOS_DE_DECISAO.map((d) => (
                  <tr key={d.materia}>
                    <td>{d.materia}</td>
                    <td>{d.decide}</td>
                    <td>
                      <span className="linha">
                        {d.artigo.split(',').map((a) => (
                          <Artigo key={a} rotulo={a.trim()} />
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Quóruns</h2>
            <span className="terciario">Capítulos XIV, XV, XXIV e XXV</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Matéria</th>
                  <th scope="col">Instância</th>
                  <th scope="col">Quórum</th>
                  <th scope="col">Base</th>
                </tr>
              </thead>
              <tbody>
                {QUORUNS.map((q) => (
                  <tr key={q.materia}>
                    <td>{q.materia}</td>
                    <td>{q.instancia}</td>
                    <td>
                      {q.quorum}
                      {q.observacao && (
                        <>
                          <br />
                          <span className="terciario pequeno">{q.observacao}</span>
                        </>
                      )}
                    </td>
                    <td>
                      <span className="linha">
                        {q.artigo.split(',').map((a) => (
                          <Artigo key={a} rotulo={a.trim()} />
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Estrutura da Diretoria Executiva</h2>
            <span className="terciario">Art. 33º</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Cargo ou diretoria</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Competências</th>
                </tr>
              </thead>
              <tbody>
                {DIRETORIAS.map((d) => (
                  <tr key={d.valor}>
                    <td>{d.rotulo}</td>
                    <td>Instituída</td>
                    <td>
                      <Artigo rotulo={d.artigo} />
                    </td>
                  </tr>
                ))}
                {DIRETORIAS_PREVISTAS_NAO_INSTITUIDAS.map((d) => (
                  <tr key={d.valor}>
                    <td>{d.rotulo}</td>
                    <td>
                      <strong>{d.situacao}</strong>
                    </td>
                    <td>
                      <span className="linha">
                        <Artigo rotulo="Art. 33º" />
                        <Artigo rotulo="Art. 44º" />
                      </span>
                      <br />
                      <span className="pequeno secundario">{d.observacao}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Índice de capítulos</h2>
            <span className="terciario">{CAPITULOS.length} capítulos</span>
          </div>
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Capítulo</th>
                  <th scope="col">Título</th>
                  <th scope="col">Artigos</th>
                </tr>
              </thead>
              <tbody>
                {CAPITULOS.map((c) => {
                  const doCapitulo = ARTIGOS.filter((a) => a.capitulo === c.numero)
                  return (
                    <tr key={c.numero}>
                      <td className="mono">{c.numero}</td>
                      <td>{c.titulo}</td>
                      <td>
                        <span className="linha">
                          {doCapitulo.map((a) => (
                            <Artigo key={a.numero} rotulo={a.rotulo} />
                          ))}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  )
}
