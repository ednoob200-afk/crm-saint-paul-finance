'use client'

import { useState } from 'react'
import { DataPrazo, Pastilha, Avatar } from '@/components/Base'

/**
 * Kanban por status. Arrastar e soltar entre colunas altera o status, o que
 * é persistido no banco e reflete na tabela e no cronograma.
 */
export default function Kanban({ quadro, grupos, itens, somenteLeitura, aoAlterarStatus, aoAbrir }) {
  const [arrastando, definirArrastando] = useState(null)
  const [colunaAlvo, definirColunaAlvo] = useState(null)

  const statusOpcoes = quadro.statusOpcoes || []
  const nomeDoGrupo = new Map(grupos.map((g) => [g.id, g.nome]))

  const semStatus = itens.filter(
    (i) => !i.status || !statusOpcoes.some((o) => o.valor === i.status),
  )

  const colunas = [
    ...statusOpcoes.map((o) => ({
      chave: o.valor,
      rotulo: o.rotulo,
      cor: o.cor,
      itens: itens.filter((i) => i.status === o.valor),
    })),
    ...(semStatus.length > 0
      ? [{ chave: '', rotulo: 'Sem status', cor: 'cinza', itens: semStatus }]
      : []),
  ]

  function soltar(status) {
    if (arrastando && arrastando.status !== status) {
      aoAlterarStatus(arrastando.id, status)
    }
    definirArrastando(null)
    definirColunaAlvo(null)
  }

  return (
    <div className="kanban">
      {colunas.map((coluna) => (
        <section
          key={coluna.chave || 'sem-status'}
          className={`coluna${colunaAlvo === coluna.chave ? ' coluna--alvo' : ''}`}
          onDragOver={(e) => {
            if (!arrastando || somenteLeitura) return
            e.preventDefault()
            definirColunaAlvo(coluna.chave)
          }}
          onDragLeave={() => definirColunaAlvo(null)}
          onDrop={(e) => {
            e.preventDefault()
            if (!somenteLeitura) soltar(coluna.chave)
          }}
          aria-label={`${coluna.rotulo}: ${coluna.itens.length} item(ns)`}
        >
          <div className="coluna__topo">
            <Pastilha cor={coluna.cor}>{coluna.rotulo}</Pastilha>
            <span className="coluna__total">{coluna.itens.length}</span>
          </div>

          <div className="coluna__lista">
            {coluna.itens.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`cartao-kanban${
                  arrastando?.id === item.id ? ' cartao-kanban--arrastando' : ''
                }`}
                draggable={!somenteLeitura}
                onDragStart={(e) => {
                  definirArrastando({ id: item.id, status: item.status })
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', item.id)
                }}
                onDragEnd={() => {
                  definirArrastando(null)
                  definirColunaAlvo(null)
                }}
                onClick={() => aoAbrir(item)}
              >
                {item.grupo_id && nomeDoGrupo.has(item.grupo_id) && (
                  <span className="cartao-kanban__grupo">{nomeDoGrupo.get(item.grupo_id)}</span>
                )}
                <span className="cartao-kanban__titulo">{item.titulo}</span>
                <span className="cartao-kanban__meta">
                  {item.responsavel && (
                    <span className="pessoa">
                      <Avatar nome={item.responsavel} />
                    </span>
                  )}
                  <DataPrazo valor={item.prazo} />
                  {item.blocker && <Pastilha cor="vermelho">Blocker</Pastilha>}
                  {!item.blocker && item.risco && <Pastilha cor="ambar">Risco</Pastilha>}
                </span>
              </button>
            ))}

            {coluna.itens.length === 0 && (
              <p className="terciario sem-margem">Nenhum item.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
