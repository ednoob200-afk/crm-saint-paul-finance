'use client'

import { useEffect, useRef, useState } from 'react'
import { Pastilha } from '@/components/Base'

/**
 * Importação em lote: cola-se a planilha, confere-se o que o sistema entendeu
 * e só então os itens são criados. A conferência é obrigatória — nenhuma
 * linha entra no quadro sem alguém ter visto.
 */
export default function Importar({ quadro, aoFechar, aoConcluir }) {
  const referencia = useRef(null)
  const [texto, definirTexto] = useState('')
  const [conferencia, definirConferencia] = useState(null)
  const [ignoradas, definirIgnoradas] = useState(() => new Set())
  const [enviando, definirEnviando] = useState(false)
  const [erro, definirErro] = useState(null)
  const [resultado, definirResultado] = useState(null)

  useEffect(() => {
    function tecla(evento) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', tecla)
    referencia.current?.focus()
    return () => document.removeEventListener('keydown', tecla)
  }, [aoFechar])

  async function chamar(confirmar) {
    definirErro(null)
    definirEnviando(true)
    try {
      const resposta = await fetch(`/api/quadros/${quadro.slug}/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, confirmar, ignorar: [...ignoradas] }),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirErro(
          corpo.erro ||
            (corpo.erros || []).map((e) => e.mensagem).join(' ') ||
            'Não foi possível ler a planilha.',
        )
        return
      }

      if (corpo.conferencia) definirConferencia(corpo)
      else definirResultado(corpo)
    } catch {
      definirErro('Falha de rede. Nada foi importado.')
    } finally {
      definirEnviando(false)
    }
  }

  function alternarLinha(linha) {
    definirIgnoradas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(linha)) proximo.delete(linha)
      else proximo.add(linha)
      return proximo
    })
  }

  const aImportar = conferencia ? conferencia.total - ignoradas.size : 0

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
        aria-label={`Importar para ${quadro.nome}`}
        tabIndex={-1}
        ref={referencia}
        style={{ width: 'min(880px, 100%)' }}
      >
        <div className="gaveta__topo">
          <div className="gaveta__titulo">
            <h2>Importar em lote</h2>
            <p className="pequeno secundario sem-margem">{quadro.nome}</p>
          </div>
          <button type="button" className="botao botao--discreto" onClick={aoFechar}>
            Fechar
          </button>
        </div>

        <div className="gaveta__corpo">
          {erro && (
            <div className="aviso aviso--erro" role="alert">
              {erro}
            </div>
          )}

          {/* ----------------------------------------------------- resultado */}
          {resultado ? (
            <>
              <div className="aviso aviso--ok">
                <strong>{resultado.criados.length} item(ns) criado(s)</strong> em {quadro.nome}.
                {resultado.ignorados > 0 && ` ${resultado.ignorados} linha(s) você deixou de fora.`}
              </div>

              {resultado.recusados.length > 0 && (
                <div className="aviso aviso--atencao">
                  <strong>{resultado.recusados.length} linha(s) não entraram.</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '1.1em' }}>
                    {resultado.recusados.map((r) => (
                      <li key={r.linha}>
                        Linha {r.linha} — {r.titulo}: {r.erros.join('; ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="barra-acoes">
                <button
                  type="button"
                  className="botao botao--primario"
                  onClick={() => aoConcluir(resultado)}
                >
                  Ver o quadro
                </button>
              </div>
            </>
          ) : conferencia ? (
            /* -------------------------------------------------- conferência */
            <>
              <div className="aviso">
                <strong>Confira antes de gravar.</strong> O sistema leu{' '}
                <strong>{conferencia.total}</strong> linha(s), separadas por{' '}
                {conferencia.delimitador}. Nada foi criado ainda. Desmarque as linhas que não devem
                entrar.
              </div>

              <section className="pilha--apertada">
                <h3>Colunas reconhecidas</h3>
                <div className="linha">
                  {conferencia.colunasReconhecidas.map((c) => (
                    <Pastilha cor="verde" key={c.campo} titulo={`Coluna "${c.coluna}"`}>
                      {c.coluna} → {c.rotulo}
                    </Pastilha>
                  ))}
                </div>
                {conferencia.colunasIgnoradas.length > 0 && (
                  <>
                    <p className="campo__ajuda" style={{ marginTop: '8px' }}>
                      Colunas que este quadro não tem, e por isso ficaram de fora:
                    </p>
                    <div className="linha">
                      {conferencia.colunasIgnoradas.map((c) => (
                        <Pastilha cor="cinza" key={c}>
                          {c}
                        </Pastilha>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {conferencia.comAviso > 0 && (
                <div className="aviso aviso--atencao">
                  <strong>{conferencia.comAviso} linha(s) com observação.</strong> Elas aparecem
                  marcadas abaixo. Os avisos não impedem a importação, mas pedem uma decisão sua.
                </div>
              )}

              <section className="pilha--apertada">
                <h3>Linhas</h3>
                <div className="rolagem-horizontal">
                  <table className="tabela-simples">
                    <thead>
                      <tr>
                        <th scope="col">Importar</th>
                        <th scope="col">Linha</th>
                        <th scope="col">{quadro.rotuloItem || 'Item'}</th>
                        <th scope="col">O que será gravado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conferencia.itens.map(({ linha, item, avisos }) => {
                        const { __grupo: grupo, dados, titulo, ...base } = item
                        const resumo = [
                          grupo ? `grupo: ${grupo}` : null,
                          ...Object.entries(base).map(([k, v]) => `${k}: ${v}`),
                          ...Object.entries(dados || {}).map(([k, v]) => `${k}: ${v}`),
                        ].filter(Boolean)

                        return (
                          <tr key={linha}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!ignoradas.has(linha)}
                                aria-label={`Importar ${titulo}`}
                                onChange={() => alternarLinha(linha)}
                              />
                            </td>
                            <td className="mono pequeno">{linha}</td>
                            <td>
                              <div className="quebra">{titulo}</div>
                              {avisos.length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  {avisos.map((a, i) => (
                                    <div className="pequeno quebra" key={i}>
                                      <Pastilha cor="ambar">Atenção</Pastilha> {a}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="pequeno quebra secundario">{resumo.join(' · ')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            /* ------------------------------------------------------- colagem */
            <>
              <div className="aviso">
                Abra a planilha, selecione as células <strong>incluindo a linha de títulos</strong>,
                copie e cole abaixo. Funciona com Excel, Google Sheets e CSV. O sistema reconhece as
                colunas pelo nome e mostra tudo para conferência antes de gravar.
              </div>

              <div className="campo">
                <label className="campo__rotulo" htmlFor="importar-texto">
                  Conteúdo da planilha
                </label>
                <textarea
                  id="importar-texto"
                  rows={12}
                  value={texto}
                  placeholder={
                    'Nome completo\tE-mail Saint Paul\tCategoria\tCargo atual\tDiretoria / Frente\tStatus\n' +
                    'Ana Souza\tana@saintpaul.edu.br\tMembro Efetivo\tMembro\t\tAtivo'
                  }
                  onChange={(e) => definirTexto(e.target.value)}
                  disabled={enviando}
                  style={{ fontFamily: 'var(--fonte-mono)', fontSize: '0.78rem' }}
                />
                <span className="campo__ajuda">
                  Campos aceitos neste quadro:{' '}
                  {[quadro.rotuloItem || 'Título', 'Grupo']
                    .concat(
                      [...(quadro.colunas || []), ...(quadro.campos || [])].map((c) => c.rotulo),
                    )
                    .join(', ')}
                  .
                </span>
              </div>
            </>
          )}
        </div>

        <div className="gaveta__rodape">
          {!conferencia && !resultado && (
            <button
              type="button"
              className="botao botao--primario"
              disabled={enviando || texto.trim().length < 5}
              onClick={() => chamar(false)}
            >
              {enviando ? 'Lendo…' : 'Ler planilha'}
            </button>
          )}

          {conferencia && !resultado && (
            <>
              <button
                type="button"
                className="botao botao--primario"
                disabled={enviando || aImportar === 0}
                onClick={() => chamar(true)}
              >
                {enviando ? 'Importando…' : `Importar ${aImportar} item(ns)`}
              </button>
              <button
                type="button"
                className="botao"
                disabled={enviando}
                onClick={() => {
                  definirConferencia(null)
                  definirIgnoradas(new Set())
                }}
              >
                Voltar e corrigir
              </button>
            </>
          )}

          <button type="button" className="botao botao--discreto" onClick={aoFechar}>
            {resultado ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </aside>
    </div>
  )
}
