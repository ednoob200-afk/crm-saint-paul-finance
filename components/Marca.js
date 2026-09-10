/**
 * Marca institucional da Saint Paul Finance.
 *
 * Arquivos oficiais em public/marca, na cor verde SPF Forward (#08382F) e na
 * versão branca. A troca entre as duas é feita por CSS, conforme o tema, para
 * que o contraste se mantenha em claro e em escuro sem depender de JavaScript.
 */

import Image from 'next/image'

/** Monograma. Usado na barra lateral, que é sempre escura. */
export function Simbolo({ altura = 34, cor = 'branca', className = '' }) {
  const largura = Math.round((altura * 1024) / 1267)
  return (
    <Image
      src={cor === 'branca' ? '/marca/simbolo-branco.png' : '/marca/simbolo-verde.png'}
      alt=""
      width={largura}
      height={altura}
      className={className}
      priority
    />
  )
}

/**
 * Lockup vertical: símbolo acima, nome em duas linhas abaixo.
 * Renderiza as duas cores e deixa o CSS escolher pelo tema.
 */
export function LogoVertical({ altura = 96 }) {
  const largura = Math.round((altura * 2048) / 2152)
  return (
    <span className="marca-troca">
      <Image
        src="/marca/vertical-verde.png"
        alt="Saint Paul Finance"
        width={largura}
        height={altura}
        className="marca marca--verde"
        priority
      />
      <Image
        src="/marca/vertical-branco.png"
        alt=""
        aria-hidden="true"
        width={largura}
        height={altura}
        className="marca marca--branca"
        priority
      />
    </span>
  )
}

/** Lockup horizontal: símbolo, divisor e nome em três linhas. */
export function LogoHorizontal({ altura = 46 }) {
  const largura = Math.round((altura * 2048) / 1062)
  return (
    <span className="marca-troca">
      <Image
        src="/marca/horizontal-verde.png"
        alt="Saint Paul Finance"
        width={largura}
        height={altura}
        className="marca marca--verde"
      />
      <Image
        src="/marca/horizontal-branco.png"
        alt=""
        aria-hidden="true"
        width={largura}
        height={altura}
        className="marca marca--branca"
      />
    </span>
  )
}
