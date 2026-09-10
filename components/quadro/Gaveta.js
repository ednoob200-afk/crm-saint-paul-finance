'use client'

import { useEffect, useRef, useState } from 'react'
import { camposDoQuadro, corStatus, rotuloStatus } from '@/lib/quadros'
import { Artigos, Pastilha } from '@/components/Base'
import { CampoGaveta } from '@/components/quadro/CampoEditavel'
import { formatarDataHora, rotuloHistorico, truncar } from '@/lib/formato'

/**
 * Gaveta lateral do item: todos os campos editáveis, descrição, artigos
 * aplicáveis, checklist, documento de origem e histórico de alterações.
 */
export default function Gaveta({
  quadro,
  item,
  grupos,
  pessoas,
  somenteLeitura,
  podeExcluir,
  aoAlterar,
  aoFechar,
  aoExcluir,
}) {
  const referencia = useRef(null)
  // O resultado carrega o id do item a que pertence. Assim a troca de item não
  // exige limpar o estado dentro do efeito, e uma resposta atrasada de outro
  // item nunca é exibida no lugar errado.
  const [carga, definirCarga] = useState({ itemId: null, historico: null, erro: null })
  const [confirmandoExclusao, definirConfirmandoExclusao] = useState(false)

  // Fecha com Escape e devolve o foco ao conteúdo da gaveta ao abrir.
  useEffect(() => {
    function tecla(evento) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', tecla)
    referencia.current?.focus()
    return () => document.removeEventListener('keydown', tecla)
  }, [aoFechar])

  useEffect(() => {
    let ativo = true
    const itemId = item.id

    async function carregar() {
      try {
        const resposta = await fetch(`/api/itens/${itemId}/historico`, { cache: 'no-store' })
        const corpo = await resposta.json().catch(() => ({}))
        if (!ativo) return
        if (!resposta.ok) {
          definirCarga({
            itemId,
            historico: null,
            erro: corpo.erro || 'Não foi possível carregar o histórico.',
          })
          return
        }
        definirCarga({ itemId, historico: corpo.historico || [], erro: null })
      } catch {
        if (ativo) {
          definirCarga({ itemId, historico: null, erro: 'Falha de rede ao carregar o histórico.' })
        }
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [item.id, item.atualizado_em])

  const desteItem = carga.itemId === item.id
  const historico = desteItem ? carga.historico : null
  const erroHistorico = desteItem ? carga.erro : null

  const todosOsCampos = camposDoQuadro(quadro)
  const camposCurtos = todosOsCampos.filter((c) => c.tipo !== 'textolongo')
  const camposLongos = todosOsCampos.filter((c) => c.tipo === 'textolongo')

  const checklist = Array.isArray(item.checklist) ? item.checklist : []

  function alternarChecklist(indice) {
    const proximo = checklist.map((c, i) => (i === indice ? { ...c, feito: !c.feito } : c))
    aoAlterar(item.id, 'checklist', proximo)
  }

  function adicionarChecklist(texto) {
    const limpo = texto.trim()
    if (!limpo) return
    aoAlterar(item.id, 'checklist', [...checklist, { texto: limpo, feito: false }])
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
        aria-label={`Item: ${item.titulo}`}
        tabIndex={-1}
        ref={referencia}
      >
        <div className="gaveta__topo">
          <div className="gaveta__titulo">
            <h2>{item.titulo}</h2>
            <div className="linha pequeno secundario">
              <Pastilha cor={corStatus(quadro, item.status)}>
                {rotuloStatus(quadro, item.status)}
              </Pastilha>
              <span className="mono">{quadro.nome}</span>
            </div>
          </div>
          <button type="button" className="botao botao--discreto" onClick={aoFechar}>
            Fechar
          </button>
        </div>

        <div className="gaveta__corpo">
          {somenteLeitura && (
            <div className="aviso">
              Seu papel permite consulta, sem alterações. Peça acesso de colaborador à Presidência.
            </div>
          )}

          <section className="pilha--apertada">
            <h3>Identificação</h3>
            <div className="campos">
              <div className="campo">
                <label className="campo__rotulo" htmlFor="gaveta-titulo">
                  Título
                </label>
                <input
                  id="gaveta-titulo"
                  type="text"
                  defaultValue={item.titulo}
                  disabled={somenteLeitura}
                  onBlur={(e) => {
                    const valor = e.target.value.trim()
                    if (valor && valor !== item.titulo) aoAlterar(item.id, 'titulo', valor)
                  }}
                />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="gaveta-grupo">
                  Grupo
                </label>
                <select
                  id="gaveta-grupo"
                  value={item.grupo_id || ''}
                  disabled={somenteLeitura}
                  onChange={(e) => aoAlterar(item.id, 'grupo_id', e.target.value || null)}
                >
                  <option value="">Sem grupo</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="pilha--apertada">
            <h3>Campos</h3>
            <div className="campos">
              {camposCurtos.map((coluna) => (
                <CampoGaveta
                  key={coluna.campo}
                  item={item}
                  coluna={coluna}
                  quadro={quadro}
                  pessoas={pessoas}
                  somenteLeitura={somenteLeitura}
                  aoAlterar={(campo, valor) => aoAlterar(item.id, campo, valor)}
                />
              ))}
            </div>
          </section>

          {camposLongos.length > 0 && (
            <section className="pilha--apertada">
              <div className="campos campos--largo">
                {camposLongos.map((coluna) => (
                  <CampoGaveta
                    key={coluna.campo}
                    item={item}
                    coluna={coluna}
                    quadro={quadro}
                    pessoas={pessoas}
                    somenteLeitura={somenteLeitura}
                    aoAlterar={(campo, valor) => aoAlterar(item.id, campo, valor)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="pilha--apertada">
            <h3>Descrição detalhada</h3>
            <textarea
              rows={6}
              defaultValue={item.descricao || ''}
              disabled={somenteLeitura}
              aria-label="Descrição detalhada"
              onBlur={(e) => {
                if (e.target.value !== (item.descricao || '')) {
                  aoAlterar(item.id, 'descricao', e.target.value)
                }
              }}
            />
          </section>

          <section className="pilha--apertada">
            <h3>Artigos aplicáveis</h3>
            <Artigos lista={item.artigos} />
            {quadro.notaEstatutaria && (
              <p className="campo__ajuda">{quadro.notaEstatutaria}</p>
            )}
          </section>

          {item.documento_id && (
            <section className="pilha--apertada">
              <h3>Documento de origem</h3>
              <p className="pequeno sem-margem">
                Este item veio da triagem de documentos.{' '}
                <a href="/documentos">Abrir documentos</a>
              </p>
              {item.origem && <p className="terciario sem-margem">{item.origem}</p>}
            </section>
          )}

          <section className="pilha--apertada">
            <h3>Checklist</h3>
            {checklist.length === 0 && <p className="terciario sem-margem">Nenhum item.</p>}
            {checklist.map((c, i) => (
              <label className="linha pequeno" key={`${c.texto}-${i}`}>
                <input
                  type="checkbox"
                  checked={Boolean(c.feito)}
                  disabled={somenteLeitura}
                  onChange={() => alternarChecklist(i)}
                />
                <span style={c.feito ? { textDecoration: 'line-through' } : undefined}>
                  {c.texto}
                </span>
              </label>
            ))}
            {!somenteLeitura && (
              <input
                type="text"
                placeholder="Adicionar item do checklist e pressionar Enter"
                aria-label="Novo item do checklist"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  adicionarChecklist(e.currentTarget.value)
                  e.currentTarget.value = ''
                }}
              />
            )}
          </section>

          <section className="pilha--apertada">
            <h3>Histórico de atualizações</h3>
            {erroHistorico && <div className="aviso aviso--erro">{erroHistorico}</div>}
            {!erroHistorico && historico === null && (
              <span className="carregando">Carregando histórico…</span>
            )}
            {historico !== null && historico.length === 0 && (
              <p className="terciario sem-margem">Sem alterações registradas.</p>
            )}
            {historico !== null && historico.length > 0 && (
              <div className="historico">
                {historico.map((h, i) => (
                  <div className="historico__item" key={`${h.criado_em}-${i}`}>
                    <span className="historico__quando">{formatarDataHora(h.criado_em)}</span>
                    <span className="historico__texto">
                      <strong>{rotuloHistorico(h.tipo)}</strong>
                      {h.campo && <span className="terciario"> · {h.campo}</span>}
                      <br />
                      {h.valor_de && (
                        <>
                          <span className="historico__valor">{truncar(h.valor_de, 90)}</span>{' '}
                          <span aria-hidden="true">→</span>{' '}
                        </>
                      )}
                      {h.valor_para ? (
                        <span className="historico__valor">{truncar(h.valor_para, 90)}</span>
                      ) : (
                        <span className="terciario">vazio</span>
                      )}
                      <br />
                      <span className="terciario">por {h.usuario}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pilha--apertada">
            <h3>Registro</h3>
            <p className="terciario sem-margem mono">
              Criado por {item.criado_por || 'sistema'} em {formatarDataHora(item.criado_em)}
              <br />
              Última atualização em {formatarDataHora(item.atualizado_em)}
            </p>
          </section>
        </div>

        <div className="gaveta__rodape">
          <button type="button" className="botao" onClick={aoFechar}>
            Fechar
          </button>
          {podeExcluir && !confirmandoExclusao && (
            <button
              type="button"
              className="botao botao--perigo"
              onClick={() => definirConfirmandoExclusao(true)}
            >
              Excluir item
            </button>
          )}
          {podeExcluir && confirmandoExclusao && (
            <>
              <span className="pequeno secundario">Excluir definitivamente?</span>
              <button
                type="button"
                className="botao botao--perigo"
                onClick={() => aoExcluir(item.id)}
              >
                Confirmar exclusão
              </button>
              <button
                type="button"
                className="botao botao--discreto"
                onClick={() => definirConfirmandoExclusao(false)}
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
