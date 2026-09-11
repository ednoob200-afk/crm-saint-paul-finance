'use client'

import { useState } from 'react'
import { CelulaEditavel } from '@/components/quadro/CampoEditavel'

/**
 * Tabela com grupos coloridos e recolhíveis, cabeçalho fixo e edição inline.
 *
 * Só a alça "⠿" é arrastável. A linha inteira não é, porque as células contêm
 * campos editáveis e arrastar a linha entraria em conflito com selecionar
 * texto e focar um campo.
 */
export default function Tabela({
  quadro,
  grupos,
  itens,
  pessoas,
  somenteLeitura,
  recolhidos,
  aoAlternarGrupo,
  aoAlterar,
  aoAbrir,
  aoNovoItem,
  aoMoverGrupo,
}) {
  const [arrastando, definirArrastando] = useState(null)
  const [alvo, definirAlvo] = useState(null)

  const colunas = quadro.colunas || []
  const totalColunas = colunas.length + 3

  const semGrupo = itens.filter((i) => !i.grupo_id)
  const blocos = [
    ...grupos.map((g) => ({
      chave: g.id,
      nome: g.nome,
      cor: g.cor,
      artigo: g.artigo,
      grupoId: g.id,
      itens: itens.filter((i) => i.grupo_id === g.id),
    })),
    ...(semGrupo.length > 0
      ? [{ chave: 'sem-grupo', nome: 'Sem grupo', cor: 'cinza', grupoId: null, itens: semGrupo }]
      : []),
  ]

  function soltar(grupoId) {
    if (arrastando && arrastando.grupoAtual !== grupoId) {
      aoMoverGrupo(arrastando.id, grupoId)
    }
    definirArrastando(null)
    definirAlvo(null)
  }

  return (
    <div className="tabela-envolvente">
      <table className="tabela">
        <caption className="oculto-visual">
          {quadro.nome}: {itens.length} item(ns) em {blocos.length} grupo(s)
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-label="Mover" />
            <th scope="col">{quadro.rotuloItem || 'Item'}</th>
            {colunas.map((c) => (
              <th scope="col" key={c.campo} title={c.ajuda || undefined}>
                {c.rotulo}
              </th>
            ))}
            <th scope="col" aria-label="Ações" />
          </tr>
        </thead>

        {blocos.map((bloco) => {
          const fechado = recolhidos.has(bloco.chave)
          return (
            <tbody key={bloco.chave}>
              <tr
                className="tabela__grupo"
                onDragOver={(e) => {
                  if (!arrastando) return
                  e.preventDefault()
                  definirAlvo(bloco.chave)
                }}
                onDragLeave={() => definirAlvo(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  soltar(bloco.grupoId)
                }}
              >
                <th colSpan={totalColunas} scope="colgroup">
                  <button
                    type="button"
                    className="grupo-cabecalho"
                    aria-expanded={!fechado}
                    onClick={() => aoAlternarGrupo(bloco.chave)}
                    style={
                      alvo === bloco.chave
                        ? { boxShadow: 'inset 0 0 0 2px var(--acento)' }
                        : undefined
                    }
                  >
                    <span className="grupo-cabecalho__seta" aria-hidden="true">
                      {fechado ? '▸' : '▾'}
                    </span>
                    <span
                      className="grupo-cabecalho__cor"
                      style={{ background: `var(--p-${bloco.cor || 'cinza'}-fundo)` }}
                      aria-hidden="true"
                    />
                    <span>{bloco.nome}</span>
                    <span className="grupo-cabecalho__total">
                      {bloco.itens.length} item{bloco.itens.length === 1 ? '' : 's'}
                    </span>
                    {bloco.artigo && (
                      <span className="pastilha pastilha--artigo">{bloco.artigo}</span>
                    )}
                  </button>
                </th>
              </tr>

              {!fechado &&
                bloco.itens.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      arrastando?.id === item.id
                        ? 'linha--arrastando'
                        : alvo === `linha-${item.id}`
                          ? 'linha--alvo'
                          : undefined
                    }
                    onDragOver={(e) => {
                      if (!arrastando) return
                      e.preventDefault()
                      definirAlvo(`linha-${item.id}`)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      soltar(item.grupo_id)
                    }}
                  >
                    <td className="celula celula--alca">
                      <span
                        className="alca"
                        role="button"
                        tabIndex={somenteLeitura ? -1 : 0}
                        draggable={!somenteLeitura}
                        aria-label={`Mover ${item.titulo} para outro grupo`}
                        title="Arraste para mudar de grupo"
                        onDragStart={(e) => {
                          definirArrastando({ id: item.id, grupoAtual: item.grupo_id })
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', item.id)
                        }}
                        onDragEnd={() => {
                          definirArrastando(null)
                          definirAlvo(null)
                        }}
                      >
                        ⠿
                      </span>
                    </td>

                    <td className="celula celula--titulo">
                      <button
                        type="button"
                        className="titulo-botao"
                        title={item.titulo}
                        onClick={() => aoAbrir(item)}
                      >
                        {item.titulo}
                      </button>
                    </td>

                    {colunas.map((coluna) => (
                      <td
                        key={coluna.campo}
                        className={`celula${coluna.tipo === 'status' ? ' celula--status' : ''}`}
                      >
                        <CelulaEditavel
                          item={item}
                          coluna={coluna}
                          quadro={quadro}
                          pessoas={pessoas}
                          somenteLeitura={somenteLeitura}
                          aoAlterar={(campo, valor) => aoAlterar(item.id, campo, valor)}
                        />
                      </td>
                    ))}

                    <td className="celula celula--acoes">
                      <button
                        type="button"
                        className="botao botao--discreto botao--pequeno"
                        onClick={() => aoAbrir(item)}
                        aria-label={`Abrir ${item.titulo}`}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}

              {!fechado && bloco.itens.length === 0 && (
                <tr>
                  <td className="celula" colSpan={totalColunas}>
                    <span className="terciario">
                      Nenhum item neste grupo. Use “Novo item” para começar.
                    </span>
                  </td>
                </tr>
              )}

              {!fechado && !somenteLeitura && bloco.grupoId && (
                <tr>
                  <td className="celula" colSpan={totalColunas}>
                    <button
                      type="button"
                      className="botao botao--discreto botao--pequeno"
                      onClick={() => aoNovoItem(bloco.grupoId)}
                    >
                      + Novo item em {bloco.nome}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
