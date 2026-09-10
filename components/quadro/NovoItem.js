'use client'

import { useEffect, useRef, useState } from 'react'
import { camposDoQuadro } from '@/lib/quadros'
import { CampoGaveta } from '@/components/quadro/CampoEditavel'

/**
 * Gaveta de criação. Mantém o rascunho em memória e só grava ao confirmar,
 * para não criar item incompleto no banco.
 */
export default function NovoItem({ quadro, grupos, grupoInicial, pessoas, aoFechar, aoCriar }) {
  const referencia = useRef(null)
  const [titulo, definirTitulo] = useState('')
  const [grupoId, definirGrupoId] = useState(grupoInicial || (grupos[0]?.id ?? ''))
  const [descricao, definirDescricao] = useState('')
  const [valores, definirValores] = useState({})
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

  const campos = camposDoQuadro(quadro)

  // Item sintético para reaproveitar os mesmos controles da gaveta de edição.
  const rascunho = { titulo, descricao, dados: {} }
  for (const [caminho, valor] of Object.entries(valores)) {
    if (caminho.startsWith('dados.')) rascunho.dados[caminho.slice('dados.'.length)] = valor
    else rascunho[caminho] = valor
  }

  function alterar(caminho, valor) {
    definirValores((atual) => ({ ...atual, [caminho]: valor }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando) return
    definirErros([])

    if (!titulo.trim()) {
      definirErros([{ campo: 'titulo', mensagem: 'Informe um título.' }])
      return
    }

    const corpo = { titulo: titulo.trim(), grupo_id: grupoId || null, dados: {} }
    if (descricao.trim()) corpo.descricao = descricao.trim()

    for (const [caminho, valor] of Object.entries(valores)) {
      if (valor === '' || valor === null || valor === undefined) continue
      if (caminho.startsWith('dados.')) corpo.dados[caminho.slice('dados.'.length)] = valor
      else corpo[caminho] = valor
    }

    definirEnviando(true)
    const resultado = await aoCriar(corpo)
    if (!resultado.ok) {
      definirErros(resultado.erros || [{ campo: 'corpo', mensagem: resultado.mensagem }])
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
        aria-label={`Novo item em ${quadro.nome}`}
        tabIndex={-1}
        ref={referencia}
      >
        <form onSubmit={enviar} style={{ display: 'contents' }}>
          <div className="gaveta__topo">
            <div className="gaveta__titulo">
              <h2>Novo {(quadro.rotuloItem || 'item').toLowerCase()}</h2>
              <p className="pequeno secundario sem-margem">{quadro.nome}</p>
            </div>
            <button type="button" className="botao botao--discreto" onClick={aoFechar}>
              Fechar
            </button>
          </div>

          <div className="gaveta__corpo">
            {erros.length > 0 && (
              <div className="aviso aviso--erro" role="alert">
                <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
                  {erros.map((e, i) => (
                    <li key={i}>
                      {e.campo && e.campo !== 'corpo' ? `${e.campo}: ` : ''}
                      {e.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="campos">
              <div className="campo">
                <label className="campo__rotulo" htmlFor="novo-titulo">
                  Título
                </label>
                <input
                  id="novo-titulo"
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => definirTitulo(e.target.value)}
                />
              </div>
              <div className="campo">
                <label className="campo__rotulo" htmlFor="novo-grupo">
                  Grupo
                </label>
                <select
                  id="novo-grupo"
                  value={grupoId}
                  onChange={(e) => definirGrupoId(e.target.value)}
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

            <div className="campos">
              {campos
                .filter((c) => c.tipo !== 'textolongo')
                .map((coluna) => (
                  <CampoGaveta
                    key={coluna.campo}
                    item={rascunho}
                    coluna={coluna}
                    quadro={quadro}
                    pessoas={pessoas}
                    aoAlterar={alterar}
                  />
                ))}
            </div>

            <div className="campos campos--largo">
              {campos
                .filter((c) => c.tipo === 'textolongo')
                .map((coluna) => (
                  <CampoGaveta
                    key={coluna.campo}
                    item={rascunho}
                    coluna={coluna}
                    quadro={quadro}
                    pessoas={pessoas}
                    aoAlterar={alterar}
                  />
                ))}

              <div className="campo">
                <label className="campo__rotulo" htmlFor="novo-descricao">
                  Descrição detalhada
                </label>
                <textarea
                  id="novo-descricao"
                  rows={5}
                  value={descricao}
                  onChange={(e) => definirDescricao(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="gaveta__rodape">
            <button type="submit" className="botao botao--primario" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" className="botao" onClick={aoFechar} disabled={enviando}>
              Cancelar
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
