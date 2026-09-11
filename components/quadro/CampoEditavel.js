'use client'

import { useState } from 'react'
import {
  CONFIDENCIALIDADE,
  DIRETORIAS,
  PRIORIDADES,
  corStatus,
} from '@/lib/quadros'
import { DataPrazo, Pastilha, Pessoa } from '@/components/Base'
import { lerCampo } from '@/lib/formato'

const TIPOS_INPUT = {
  texto: 'text',
  email: 'email',
  telefone: 'tel',
  url: 'url',
  numero: 'number',
  data: 'date',
}

/**
 * Largura do campo em caracteres, para a coluna acompanhar o que foi escrito.
 *
 * Um input tem largura intrínseca fixa de cerca de vinte caracteres, então sem
 * isto a tabela distribui espaço sem olhar o conteúdo e nomes longos aparecem
 * cortados. Campos de data têm largura própria do navegador e ficam de fora.
 */
function larguraEmCaracteres(valor, tipo) {
  if (tipo === 'data' || tipo === 'numero') return undefined
  const escrito = String(valor ?? '').length
  // Piso para a coluna não ficar estreita demais quando vazia; teto para um
  // texto muito longo não empurrar as outras colunas para fora da tela. Acima
  // do teto, o valor inteiro aparece ao passar o mouse e na gaveta do item.
  return Math.min(Math.max(escrito + 2, 12), 56)
}

/**
 * Campo com escrita adiada: o valor local acompanha a digitação e só é
 * enviado no blur ou no Enter, para não gerar uma requisição por tecla.
 *
 * Quando o servidor devolve outro valor, o rascunho é ajustado durante a
 * renderização — e não em efeito — que é o padrão recomendado para
 * sincronizar estado derivado de propriedade sem render em cascata.
 */
function useValorLocal(valor) {
  const [local, definirLocal] = useState(valor ?? '')
  const [valorConhecido, definirValorConhecido] = useState(valor)

  if (valor !== valorConhecido) {
    definirValorConhecido(valor)
    definirLocal(valor ?? '')
  }

  return [local, definirLocal]
}

function opcoesDe(coluna, quadro, pessoas) {
  switch (coluna.tipo) {
    case 'status':
      return (quadro.statusOpcoes || []).map((o) => ({ valor: o.valor, rotulo: o.rotulo }))
    case 'prioridade':
      return PRIORIDADES.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))
    case 'confidencialidade':
      return CONFIDENCIALIDADE.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))
    case 'diretoria':
      return DIRETORIAS.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))
    case 'pessoa':
      return (pessoas || []).map((n) => ({ valor: n, rotulo: n }))
    case 'select':
      return (coluna.opcoes || []).map((o) => ({ valor: o.valor, rotulo: o.rotulo }))
    default:
      return null
  }
}

/**
 * Célula editável da tabela. Quando `somenteLeitura`, mostra a representação
 * visual em vez do controle de edição.
 */
export function CelulaEditavel({ item, coluna, quadro, pessoas, somenteLeitura, aoAlterar }) {
  const valor = lerCampo(item, coluna.campo)
  const [local, definirLocal] = useValorLocal(valor)

  if (coluna.tipo === 'status') {
    const cor = corStatus(quadro, valor)
    if (somenteLeitura) {
      const opcao = (quadro.statusOpcoes || []).find((o) => o.valor === valor)
      return <Pastilha cor={cor}>{opcao ? opcao.rotulo : '—'}</Pastilha>
    }
    return (
      <select
        className={`status-select status-select--${cor}`}
        value={valor ?? ''}
        onChange={(e) => aoAlterar(coluna.campo, e.target.value)}
        aria-label={coluna.rotulo}
      >
        <option value="">Sem status</option>
        {(quadro.statusOpcoes || []).map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    )
  }

  if (coluna.tipo === 'booleano') {
    return (
      <input
        type="checkbox"
        checked={Boolean(valor)}
        disabled={somenteLeitura}
        aria-label={coluna.rotulo}
        onChange={(e) => aoAlterar(coluna.campo, e.target.checked)}
      />
    )
  }

  if (somenteLeitura) {
    if (coluna.tipo === 'pessoa') return <Pessoa nome={valor} />
    if (coluna.tipo === 'data') return <DataPrazo valor={valor} />
    if (coluna.tipo === 'prioridade') {
      const p = PRIORIDADES.find((x) => x.valor === valor)
      return p ? <Pastilha cor={p.cor}>{p.rotulo}</Pastilha> : <span className="terciario">—</span>
    }
    if (coluna.tipo === 'confidencialidade') {
      const c = CONFIDENCIALIDADE.find((x) => x.valor === valor)
      return c ? <Pastilha cor={c.cor}>{c.rotulo}</Pastilha> : <span className="terciario">—</span>
    }
    return <span className="quebra">{valor || <span className="terciario">—</span>}</span>
  }

  const opcoes = opcoesDe(coluna, quadro, pessoas)

  if (opcoes) {
    const conhecido = valor === null || valor === '' || opcoes.some((o) => o.valor === valor)
    return (
      <select
        className="inline"
        value={valor ?? ''}
        onChange={(e) => aoAlterar(coluna.campo, e.target.value)}
        aria-label={coluna.rotulo}
      >
        <option value="">—</option>
        {/* Valor gravado fora da lista continua visível em vez de virar vazio. */}
        {!conhecido && <option value={valor}>{valor}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    )
  }

  if (coluna.tipo === 'textolongo') {
    return (
      <textarea
        className="inline"
        rows={2}
        cols={larguraEmCaracteres(local, 'texto')}
        value={local}
        aria-label={coluna.rotulo}
        onChange={(e) => definirLocal(e.target.value)}
        onBlur={() => {
          if ((local || '') !== (valor || '')) aoAlterar(coluna.campo, local)
        }}
      />
    )
  }

  return (
    <input
      className={`inline${coluna.tipo === 'data' ? ' inline--data' : ''}`}
      type={TIPOS_INPUT[coluna.tipo] || 'text'}
      size={larguraEmCaracteres(local, coluna.tipo)}
      value={local}
      aria-label={coluna.rotulo}
      title={local || undefined}
      onChange={(e) => definirLocal(e.target.value)}
      onBlur={() => {
        if ((local || '') !== (valor || '')) aoAlterar(coluna.campo, local)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') definirLocal(valor ?? '')
      }}
    />
  )
}

/** Campo rotulado da gaveta, com ajuda e base estatutária. */
export function CampoGaveta({ item, coluna, quadro, pessoas, somenteLeitura, aoAlterar }) {
  const valor = lerCampo(item, coluna.campo)
  const [local, definirLocal] = useValorLocal(valor)
  const id = `campo-${coluna.campo.replace(/\./g, '-')}`
  const opcoes = opcoesDe(coluna, quadro, pessoas)

  function controle() {
    if (coluna.tipo === 'booleano') {
      return (
        <label className="linha pequeno">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(valor)}
            disabled={somenteLeitura}
            onChange={(e) => aoAlterar(coluna.campo, e.target.checked)}
          />
          <span>{valor ? 'Sim' : 'Não'}</span>
        </label>
      )
    }

    if (opcoes) {
      const conhecido = valor === null || valor === '' || opcoes.some((o) => o.valor === valor)
      return (
        <select
          id={id}
          value={valor ?? ''}
          disabled={somenteLeitura}
          onChange={(e) => aoAlterar(coluna.campo, e.target.value)}
        >
          <option value="">—</option>
          {!conhecido && <option value={valor}>{valor}</option>}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      )
    }

    if (coluna.tipo === 'textolongo') {
      return (
        <textarea
          id={id}
          rows={4}
          value={local}
          disabled={somenteLeitura}
          onChange={(e) => definirLocal(e.target.value)}
          onBlur={() => {
            if ((local || '') !== (valor || '')) aoAlterar(coluna.campo, local)
          }}
        />
      )
    }

    return (
      <input
        id={id}
        type={TIPOS_INPUT[coluna.tipo] || 'text'}
        value={local}
        disabled={somenteLeitura}
        onChange={(e) => definirLocal(e.target.value)}
        onBlur={() => {
          if ((local || '') !== (valor || '')) aoAlterar(coluna.campo, local)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && coluna.tipo !== 'textolongo') e.currentTarget.blur()
        }}
      />
    )
  }

  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor={id}>
        {coluna.rotulo}
      </label>
      {controle()}
      {coluna.ajuda && <span className="campo__ajuda">{coluna.ajuda}</span>}
    </div>
  )
}
