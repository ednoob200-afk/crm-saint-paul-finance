'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MENU, PAPEIS } from '@/lib/quadros'
import AlternarTema from '@/components/AlternarTema'
import BotaoSair from '@/components/BotaoSair'

export default function BarraLateral({ usuario, versaoEstatuto }) {
  const caminho = usePathname()
  const [aberta, definirAberta] = useState(false)

  const papel = PAPEIS.find((p) => p.valor === usuario.papel)

  // Numeração contínua dos 15 itens, calculada antes de renderizar para não
  // depender de uma variável mutada durante a renderização.
  const numeroDoItem = new Map(
    MENU.flatMap((secao) => secao.itens).map((item, indice) => [item.slug, indice + 1]),
  )

  return (
    <nav
      className={`barra${aberta ? ' barra--aberta' : ''}`}
      aria-label="Navegação principal"
    >
      <div className="barra__marca">
        <span className="barra__sigla" aria-hidden="true">
          SPF
        </span>
        <div className="crescer">
          <div className="barra__nome">Saint Paul Finance</div>
          <div className="barra__papel">{papel ? papel.rotulo : usuario.papel}</div>
        </div>
        <button
          type="button"
          className="barra__alternar"
          aria-expanded={aberta}
          onClick={() => definirAberta((v) => !v)}
        >
          {aberta ? 'Fechar' : 'Menu'}
        </button>
      </div>

      <div className="barra__navegacao">
        {MENU.map((secao) => (
          <div className="barra__secao" key={secao.secao}>
            <div className="barra__secao-titulo">{secao.secao}</div>
            {secao.itens.map((item) => {
              const ativo =
                caminho === item.href ||
                (item.href !== '/painel' && caminho.startsWith(`${item.href}/`))
              return (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="barra__item"
                  aria-current={ativo ? 'page' : undefined}
                  onClick={() => definirAberta(false)}
                  title={item.descricao}
                >
                  <span className="barra__numero" aria-hidden="true">
                    {numeroDoItem.get(item.slug)}
                  </span>
                  <span>{item.nome}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="barra__rodape">
        <div>
          <div>{usuario.nome}</div>
          <div className="mono">{usuario.email}</div>
        </div>
        <div className="mono">Estatuto: {versaoEstatuto}</div>
        <AlternarTema />
        <BotaoSair />
      </div>
    </nav>
  )
}
