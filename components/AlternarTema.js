'use client'

import { useCallback, useSyncExternalStore } from 'react'

const CHAVE = 'spf_tema'
const OPCOES = [
  { valor: 'sistema', rotulo: 'Sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
]

const ouvintes = new Set()

function notificar() {
  for (const ouvinte of ouvintes) ouvinte()
}

function assinar(ouvinte) {
  ouvintes.add(ouvinte)
  window.addEventListener('storage', ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
    window.removeEventListener('storage', ouvinte)
  }
}

/** Leitura protegida: em navegação privada o acesso pode lançar. */
function lerTema() {
  try {
    const valor = localStorage.getItem(CHAVE)
    return valor === 'claro' || valor === 'escuro' ? valor : 'sistema'
  } catch {
    return 'sistema'
  }
}

/** No servidor não há preferência gravada; o script do <head> resolve depois. */
function temaNoServidor() {
  return 'sistema'
}

export default function AlternarTema() {
  // useSyncExternalStore lê a preferência sem efeito e sem render em cascata.
  const tema = useSyncExternalStore(assinar, lerTema, temaNoServidor)

  const alterar = useCallback((valor) => {
    try {
      if (valor === 'sistema') localStorage.removeItem(CHAVE)
      else localStorage.setItem(CHAVE, valor)
    } catch {
      // Preferência apenas visual: perder isto não afeta nenhum dado da Liga.
    }
    const raiz = document.documentElement
    if (valor === 'sistema') raiz.removeAttribute('data-theme')
    else raiz.setAttribute('data-theme', valor)
    notificar()
  }, [])

  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor="tema" style={{ color: 'inherit' }}>
        Tema
      </label>
      {/* O servidor não conhece a preferência do navegador; o script do <head>
          já aplicou o tema e a hidratação apenas alinha o seletor. */}
      <select
        id="tema"
        value={tema}
        suppressHydrationWarning
        onChange={(e) => alterar(e.target.value)}
      >
        {OPCOES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  )
}
