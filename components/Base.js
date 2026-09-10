/**
 * Primitivos visuais sem estado, usados por páginas de servidor e por
 * componentes de cliente.
 */

import Link from 'next/link'
import { formatarData, iniciais, situacaoDoPrazo } from '@/lib/formato'
import { CONFIDENCIALIDADE, PRIORIDADES, rotuloDiretoria } from '@/lib/quadros'

export function Pastilha({ cor = 'cinza', children, titulo }) {
  if (children === null || children === undefined || children === '') return <span>—</span>
  return (
    <span className={`pastilha pastilha--${cor}`} title={titulo || undefined}>
      {children}
    </span>
  )
}

export function Avatar({ nome }) {
  if (!nome) {
    return (
      <span className="avatar avatar--vazio" aria-hidden="true">
        ·
      </span>
    )
  }
  return (
    <span className="avatar" aria-hidden="true">
      {iniciais(nome)}
    </span>
  )
}

export function Pessoa({ nome }) {
  return (
    <span className="pessoa">
      <Avatar nome={nome} />
      <span className="pessoa__nome">{nome || <span className="terciario">Sem responsável</span>}</span>
    </span>
  )
}

/**
 * Prazo com semáforo: vencido em vermelho, vencendo em até sete dias em
 * âmbar, o resto neutro.
 */
export function DataPrazo({ valor }) {
  if (!valor) return <span className="data data--vazia">—</span>
  const situacao = situacaoDoPrazo(valor)
  const classe =
    situacao === 'vencida' ? 'data data--vencida' : situacao === 'proxima' ? 'data data--proxima' : 'data'
  const rotulo =
    situacao === 'vencida' ? 'Prazo vencido' : situacao === 'proxima' ? 'Vence em até sete dias' : undefined
  return (
    <span className={classe} title={rotulo}>
      {formatarData(valor)}
    </span>
  )
}

export function Prioridade({ valor }) {
  const p = PRIORIDADES.find((x) => x.valor === valor)
  if (!p) return <span className="terciario">—</span>
  return <Pastilha cor={p.cor}>{p.rotulo}</Pastilha>
}

export function Confidencialidade({ valor }) {
  const c = CONFIDENCIALIDADE.find((x) => x.valor === valor)
  if (!c) return <span className="terciario">—</span>
  return <Pastilha cor={c.cor}>{c.rotulo}</Pastilha>
}

export function Diretoria({ valor }) {
  if (!valor) return <span className="terciario">—</span>
  return <span>{rotuloDiretoria(valor)}</span>
}

/** Referência estatutária clicável, que abre o artigo na Consulta ao Estatuto. */
export function Artigo({ rotulo, justificativa }) {
  if (!rotulo) return null
  const numero = String(rotulo).match(/(\d{1,3})/)
  const destino = numero ? `/estatuto?artigo=${numero[1]}` : '/estatuto'
  return (
    <Link className="pastilha pastilha--artigo" href={destino} title={justificativa || undefined}>
      {rotulo}
    </Link>
  )
}

export function Artigos({ lista }) {
  const itens = (lista || []).filter((a) => a && (a.artigo || typeof a === 'string'))
  if (itens.length === 0) return <span className="terciario">Sem referência registrada</span>
  return (
    <span className="linha">
      {itens.map((a, i) => (
        <Artigo
          key={`${a.artigo || a}-${i}`}
          rotulo={a.artigo || a}
          justificativa={a.justificativa}
        />
      ))}
    </span>
  )
}

export function NotaEstatutaria({ children }) {
  if (!children) return null
  return (
    <div className="nota-estatutaria">
      <strong>Base estatutária. </strong>
      {children}
    </div>
  )
}

export function Vazio({ titulo, children }) {
  return (
    <div className="vazio">
      <h3>{titulo}</h3>
      {children}
    </div>
  )
}

export function Citacao({ rotulo, children }) {
  return (
    <blockquote className="citacao">
      {rotulo && <span className="citacao__rotulo">{rotulo}</span>}
      {children}
    </blockquote>
  )
}
