'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FormularioAtivacao({ token, email }) {
  const router = useRouter()
  const [nome, definirNome] = useState('')
  const [senha, definirSenha] = useState('')
  const [confirmacao, definirConfirmacao] = useState('')
  const [enviando, definirEnviando] = useState(false)
  const [mensagem, definirMensagem] = useState(null)

  const curta = senha.length > 0 && senha.length < 12
  const divergem = confirmacao.length > 0 && senha !== confirmacao
  const pronto = nome.trim().length >= 2 && senha.length >= 12 && senha === confirmacao

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando || !pronto) return
    definirMensagem(null)
    definirEnviando(true)

    try {
      const resposta = await fetch('/api/ativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nome: nome.trim(), senha }),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem(
          corpo.erro ||
            (corpo.erros || []).map((e) => e.mensagem).join(' ') ||
            'Não foi possível ativar o acesso.',
        )
        definirEnviando(false)
        return
      }

      definirSenha('')
      definirConfirmacao('')
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
        <label className="campo__rotulo" htmlFor="ativar-email">
          E-mail
        </label>
        <input id="ativar-email" type="email" value={email} readOnly disabled />
        <span className="campo__ajuda">Definido pela Presidência no convite.</span>
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="ativar-nome">
          Nome completo
        </label>
        <input
          id="ativar-nome"
          type="text"
          required
          autoComplete="name"
          value={nome}
          onChange={(e) => definirNome(e.target.value)}
          disabled={enviando}
        />
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="ativar-senha">
          Crie sua senha
        </label>
        <input
          id="ativar-senha"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          value={senha}
          onChange={(e) => definirSenha(e.target.value)}
          disabled={enviando}
        />
        {curta ? (
          <span className="campo__erro">Use pelo menos 12 caracteres.</span>
        ) : (
          <span className="campo__ajuda">Pelo menos 12 caracteres.</span>
        )}
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="ativar-confirmacao">
          Repita a senha
        </label>
        <input
          id="ativar-confirmacao"
          type="password"
          required
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => definirConfirmacao(e.target.value)}
          disabled={enviando}
        />
        {divergem && <span className="campo__erro">As senhas não coincidem.</span>}
      </div>

      <button type="submit" className="botao botao--primario" disabled={enviando || !pronto}>
        {enviando ? 'Ativando…' : 'Ativar acesso e entrar'}
      </button>
    </form>
  )
}
