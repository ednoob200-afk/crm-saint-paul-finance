'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FormularioEntrada({ bloqueado = false }) {
  const router = useRouter()
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const [enviando, definirEnviando] = useState(false)
  const [mensagem, definirMensagem] = useState(null)

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando) return
    definirMensagem(null)
    definirEnviando(true)

    try {
      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem(corpo.erro || 'Não foi possível entrar.')
        definirEnviando(false)
        return
      }

      definirSenha('')
      router.replace('/painel')
      router.refresh()
    } catch {
      definirMensagem('Falha de rede. Verifique a conexão e tente novamente.')
      definirEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="pilha" noValidate>
      {mensagem && (
        <div className="aviso aviso--erro" role="alert">
          {mensagem}
        </div>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => definirEmail(e.target.value)}
          disabled={bloqueado || enviando}
        />
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => definirSenha(e.target.value)}
          disabled={bloqueado || enviando}
        />
      </div>

      <button type="submit" className="botao botao--primario" disabled={bloqueado || enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
