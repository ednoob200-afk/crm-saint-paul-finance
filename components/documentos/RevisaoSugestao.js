'use client'

import { useEffect, useRef, useState } from 'react'
import { obterQuadro } from '@/lib/quadros'
import { Artigo } from '@/components/Base'

const TIPOS = [
  'ata',
  'decisao',
  'tarefa',
  'parceria',
  'comunicacao',
  'candidato',
  'producao',
  'evento',
  'outro',
]

/** Remove as marcas internas antes de editar e reenviar. */
function limpar(sugestao) {
  const base = {
    titulo: '',
    tipo: 'outro',
    diretoriaCompetente: '',
    coResponsavel: '',
    quadroDestino: '',
    grupoDestino: '',
    resumo: '',
    descricaoCompleta: '',
    confidencialidade: 'interno',
    artigosAplicaveis: [],
    prioridade: 'media',
    prazo: null,
    proximoPasso: '',
    organizacao: '',
    email: '',
    telefone: '',
    responsavelSugerido: '',
    riscos: [],
    justificativaDoRoteamento: '',
    ...(sugestao || {}),
  }
  delete base._avisos
  delete base._truncado
  return base
}

export default function RevisaoSugestao({
  documento,
  sugestaoOriginal,
  avisos,
  truncado,
  modelo,
  podeDistribuir,
  quadros,
  diretorias,
  prioridades,
  confidencialidades,
  aoFechar,
  aoDistribuir,
  aoDescartar,
}) {
  const referencia = useRef(null)
  const [sugestao, definirSugestao] = useState(() => limpar(sugestaoOriginal))
  const [enviando, definirEnviando] = useState(false)
  const [erros, definirErros] = useState([])

  useEffect(() => {
    function tecla(evento) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', tecla)
    referencia.current?.focus()
    return () => document.removeEventListener('keydown', tecla)
  }, [aoFechar])

  const quadroEscolhido = obterQuadro(sugestao.quadroDestino)
  const grupos = quadroEscolhido ? quadroEscolhido.grupos || [] : []

  function definir(campo, valor) {
    definirSugestao((atual) => ({ ...atual, [campo]: valor }))
  }

  function alterarArtigo(indice, campo, valor) {
    definirSugestao((atual) => ({
      ...atual,
      artigosAplicaveis: atual.artigosAplicaveis.map((a, i) =>
        i === indice ? { ...a, [campo]: valor } : a,
      ),
    }))
  }

  async function distribuir(evento) {
    evento.preventDefault()
    if (enviando) return
    definirErros([])

    const problemas = []
    if (!sugestao.titulo.trim()) {
      problemas.push({ campo: 'titulo', mensagem: 'Informe o título do item.' })
    }
    if (!sugestao.quadroDestino) {
      problemas.push({ campo: 'quadroDestino', mensagem: 'Escolha o quadro de destino.' })
    }
    if (problemas.length > 0) {
      definirErros(problemas)
      return
    }

    definirEnviando(true)
    const resultado = await aoDistribuir({
      ...sugestao,
      prazo: sugestao.prazo || null,
      riscos: (sugestao.riscos || []).filter(Boolean),
    })
    if (!resultado.ok) {
      definirErros(resultado.erros || [{ campo: '', mensagem: resultado.mensagem }])
      definirEnviando(false)
    }
  }

  return (
    <div
      className="gaveta-fundo"
      role="presentation"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
    >
      <aside
        className="gaveta"
        role="dialog"
        aria-modal="true"
        aria-label="Revisão da sugestão de triagem"
        tabIndex={-1}
        ref={referencia}
      >
        <form onSubmit={distribuir} style={{ display: 'contents' }}>
          <div className="gaveta__topo">
            <div className="gaveta__titulo">
              <h2>Revisar sugestão</h2>
              <p className="pequeno secundario sem-margem quebra">{documento.nome}</p>
            </div>
            <button type="button" className="botao botao--discreto" onClick={aoFechar}>
              Fechar
            </button>
          </div>

          <div className="gaveta__corpo">
            <div className="aviso">
              <strong>A IA sugere; a pessoa decide.</strong> Todos os campos abaixo são editáveis.
              Nada é criado em quadro nenhum até você clicar em “Aprovar e distribuir”. O item
              guardará quem aprovou, quando, a sugestão original, as alterações manuais e os artigos
              usados no roteamento (Art. 100º e Art. 110º).
            </div>

            {truncado && (
              <div className="aviso aviso--atencao">
                O conteúdo enviado ao modelo foi truncado por tamanho. Confira se a parte relevante
                do documento foi considerada.
              </div>
            )}

            {avisos?.length > 0 && (
              <div className="aviso aviso--atencao">
                <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
                  {avisos.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {erros.length > 0 && (
              <div className="aviso aviso--erro" role="alert">
                <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
                  {erros.map((e, i) => (
                    <li key={i}>
                      {e.campo ? `${e.campo}: ` : ''}
                      {e.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <section className="pilha--apertada">
              <h3>Classificação</h3>
              <div className="campos">
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-titulo">
                    Título
                  </label>
                  <input
                    id="s-titulo"
                    type="text"
                    required
                    value={sugestao.titulo}
                    onChange={(e) => definir('titulo', e.target.value)}
                  />
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-tipo">
                    Tipo
                  </label>
                  <select
                    id="s-tipo"
                    value={sugestao.tipo}
                    onChange={(e) => definir('tipo', e.target.value)}
                  >
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-quadro">
                    Quadro de destino
                  </label>
                  <select
                    id="s-quadro"
                    required
                    value={sugestao.quadroDestino}
                    onChange={(e) => {
                      definir('quadroDestino', e.target.value)
                      definir('grupoDestino', '')
                    }}
                  >
                    <option value="">Escolher…</option>
                    {quadros.map((q) => (
                      <option key={q.slug} value={q.slug}>
                        {q.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-grupo">
                    Grupo de destino
                  </label>
                  <select
                    id="s-grupo"
                    value={sugestao.grupoDestino}
                    disabled={!quadroEscolhido}
                    onChange={(e) => definir('grupoDestino', e.target.value)}
                  >
                    <option value="">Sem grupo</option>
                    {grupos.map((g) => (
                      <option key={g.nome} value={g.nome}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-diretoria">
                    Diretoria competente
                  </label>
                  <select
                    id="s-diretoria"
                    value={sugestao.diretoriaCompetente}
                    onChange={(e) => definir('diretoriaCompetente', e.target.value)}
                  >
                    <option value="">Não definida</option>
                    {diretorias.map((d) => (
                      <option key={d.valor} value={d.valor}>
                        {d.rotulo}
                      </option>
                    ))}
                  </select>
                  <span className="campo__ajuda">
                    A Diretoria Financeira não aparece aqui: o Art. 33º VII a prevê apenas “quando
                    instituída” e a Liga não a instituiu (Art. 33º §2º).
                  </span>
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-co">
                    Co-responsável
                  </label>
                  <select
                    id="s-co"
                    value={sugestao.coResponsavel}
                    onChange={(e) => definir('coResponsavel', e.target.value)}
                  >
                    <option value="">Não definido</option>
                    {diretorias.map((d) => (
                      <option key={d.valor} value={d.valor}>
                        {d.rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-prioridade">
                    Prioridade
                  </label>
                  <select
                    id="s-prioridade"
                    value={sugestao.prioridade}
                    onChange={(e) => definir('prioridade', e.target.value)}
                  >
                    {prioridades.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-conf">
                    Confidencialidade
                  </label>
                  <select
                    id="s-conf"
                    value={sugestao.confidencialidade}
                    onChange={(e) => definir('confidencialidade', e.target.value)}
                  >
                    {confidencialidades.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-prazo">
                    Prazo
                  </label>
                  <input
                    id="s-prazo"
                    type="date"
                    value={sugestao.prazo || ''}
                    onChange={(e) => definir('prazo', e.target.value || null)}
                  />
                </div>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-responsavel">
                    Responsável sugerido
                  </label>
                  <input
                    id="s-responsavel"
                    type="text"
                    value={sugestao.responsavelSugerido}
                    onChange={(e) => definir('responsavelSugerido', e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="pilha--apertada">
              <h3>Contato e organização</h3>
              <div className="campos">
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-org">
                    Organização
                  </label>
                  <input
                    id="s-org"
                    type="text"
                    value={sugestao.organizacao}
                    onChange={(e) => definir('organizacao', e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-email">
                    E-mail
                  </label>
                  <input
                    id="s-email"
                    type="text"
                    value={sugestao.email}
                    onChange={(e) => definir('email', e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-tel">
                    Telefone
                  </label>
                  <input
                    id="s-tel"
                    type="text"
                    value={sugestao.telefone}
                    onChange={(e) => definir('telefone', e.target.value)}
                  />
                </div>
              </div>
              <p className="campo__ajuda">
                Estes campos só são gravados quando o quadro escolhido os possui.
              </p>
            </section>

            <section className="pilha--apertada">
              <h3>Conteúdo</h3>
              <div className="campos campos--largo">
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-resumo">
                    Resumo
                  </label>
                  <textarea
                    id="s-resumo"
                    rows={3}
                    value={sugestao.resumo}
                    onChange={(e) => definir('resumo', e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-descricao">
                    Descrição completa
                  </label>
                  <textarea
                    id="s-descricao"
                    rows={6}
                    value={sugestao.descricaoCompleta}
                    onChange={(e) => definir('descricaoCompleta', e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-proximo">
                    Próximo passo
                  </label>
                  <input
                    id="s-proximo"
                    type="text"
                    value={sugestao.proximoPasso}
                    onChange={(e) => definir('proximoPasso', e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="s-riscos">
                    Riscos, um por linha
                  </label>
                  <textarea
                    id="s-riscos"
                    rows={3}
                    value={(sugestao.riscos || []).join('\n')}
                    onChange={(e) =>
                      definir(
                        'riscos',
                        e.target.value.split('\n').map((l) => l.trim()),
                      )
                    }
                  />
                </div>
              </div>
            </section>

            <section className="pilha--apertada">
              <h3>Artigos aplicáveis</h3>
              {(sugestao.artigosAplicaveis || []).length === 0 && (
                <p className="terciario sem-margem">
                  A IA não indicou base estatutária suficiente. Se o caso for omisso, encaminhe à
                  Presidência (Art. 120º II).
                </p>
              )}
              {(sugestao.artigosAplicaveis || []).map((a, i) => (
                <div className="campos" key={i}>
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor={`s-artigo-${i}`}>
                      Artigo
                    </label>
                    <div className="linha">
                      <input
                        id={`s-artigo-${i}`}
                        type="text"
                        value={a.artigo || ''}
                        onChange={(e) => alterarArtigo(i, 'artigo', e.target.value)}
                      />
                      <Artigo rotulo={a.artigo} />
                    </div>
                  </div>
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor={`s-just-${i}`}>
                      Justificativa
                    </label>
                    <input
                      id={`s-just-${i}`}
                      type="text"
                      value={a.justificativa || ''}
                      onChange={(e) => alterarArtigo(i, 'justificativa', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <p className="campo__ajuda">
                Referências que não existem no Estatuto vigente são descartadas pelo servidor antes
                de virarem base de decisão.
              </p>
            </section>

            <section className="pilha--apertada">
              <h3>Justificativa do roteamento</h3>
              <textarea
                rows={4}
                aria-label="Justificativa do roteamento"
                value={sugestao.justificativaDoRoteamento}
                onChange={(e) => definir('justificativaDoRoteamento', e.target.value)}
              />
              {modelo && (
                <p className="terciario sem-margem mono">Sugestão produzida por {modelo}.</p>
              )}
            </section>
          </div>

          <div className="gaveta__rodape">
            <button
              type="submit"
              className="botao botao--primario"
              disabled={enviando || !podeDistribuir}
              title={
                podeDistribuir
                  ? undefined
                  : 'Distribuir exige papel de Diretor ou superior (Art. 45º §3º).'
              }
            >
              {enviando ? 'Distribuindo…' : 'Aprovar e distribuir'}
            </button>
            <button type="button" className="botao" onClick={aoFechar} disabled={enviando}>
              Cancelar
            </button>
            <button
              type="button"
              className="botao botao--perigo"
              onClick={aoDescartar}
              disabled={enviando}
            >
              Descartar sugestão
            </button>
          </div>
        </form>

        {!podeDistribuir && (
          <div className="aviso aviso--atencao" style={{ margin: '0 16px 16px' }}>
            Seu papel não autoriza distribuir. Um Diretor, a Vice-Presidência ou a Presidência
            precisa aprovar (Art. 45º §3º).
          </div>
        )}
      </aside>
    </div>
  )
}
