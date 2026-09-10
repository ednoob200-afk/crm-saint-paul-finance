'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BotaoSair() {
  const router = useRouter()
  const [saindo, definirSaindo] = useState(false)

  async function sair() {
    if (saindo) return
    definirSaindo(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Mesmo sem resposta, segue para a tela de acesso.
    }
    router.replace('/entrar')
    router.refresh()
  }

  return (
    <button type="button" className="botao botao--pequeno" onClick={sair} disabled={saindo}>
      {saindo ? 'Saindo…' : 'Encerrar sessão'}
    </button>
  )
}
