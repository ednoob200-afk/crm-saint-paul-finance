'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Duas formas de chegar ao sistema:
 *
 * - Entrar: quem já criou a senha.
 * - Primeiro acesso: quem está na lista de acesso e ainda não criou a senha.
 *   A pessoa cria a própria senha; ninguém distribui senha por mensagem e nem
 *   a Presidência conhece a senha de outra pessoa.
 */
export default function FormularioEntrada({ bloqueado = false }) {
  const router = useRouter()
  const [modo, definirModo] = useState('entrar')
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const [nome, definirNome] = useState('')
  const [confirmacao, definirConfirmacao] = useState('')
  const [enviando, definirEnviando] = useState(false)
  const [mensagem, definirMensagem] = useState(null)

  const primeiro = modo === 'primeiro'
  const curta = primeiro && senha.length > 0 && senha.length < 12
  const divergem = primeiro && confirmacao.length > 0 && senha !== confirmacao

  const pronto = primeiro
    ? email.trim() !== '' && nome.trim().length >= 2 && senha.length >= 12 && senha === confirmacao
    : email.trim() !== '' && senha !== ''

  function trocarModo(novo) {
    definirModo(novo)
    definirMensagem(null)
    definirSenha('')
    definirConfirmacao('')
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando || !pronto) return
    definirMensagem(null)
    definirEnviando(true)

    const destino = primeiro ? '/api/primeiro-acesso' : '/api/auth/login'
    const corpo = primeiro
      ? { email: email.trim(), nome: nome.trim(), senha }
      : { email: email.trim(), senha }

    try {
      const resposta = await fetch(destino, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const retorno = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem(
          retorno.erro ||
            (retorno.erros || []).map((e) => e.mensagem).join(' ') ||
            'Não foi possível continuar.',
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
    <div className="pilha--apertada">
      <div className="abas" role="tablist" aria-label="Forma de acesso">
        <button
          type="button"
          role="tab"
          className="abas__botao"
          aria-selected={!primeiro}
          onClick={() => trocarModo('entrar')}
          disabled={enviando}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          className="abas__botao"
          aria-selected={primeiro}
          onClick={() => trocarModo('primeiro')}
          disabled={enviando}
        >
          Primeiro acesso
        </button>
      </div>

      {primeiro && (
        <p className="campo__ajuda">
          Se o seu e-mail está na lista de acesso da Liga, crie sua senha aqui. Ela é guardada apenas
          como hash e não é conhecida por ninguém, nem pela Presidência.
        </p>
      )}

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
          {primeiro && (
            <span className="campo__ajuda">Use o e-mail que a Presidência autorizou.</span>
          )}
        </div>

        {primeiro && (
          <div className="campo">
            <label className="campo__rotulo" htmlFor="nome">
              Nome completo
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              autoComplete="name"
              required
              value={nome}
              onChange={(e) => definirNome(e.target.value)}
              disabled={bloqueado || enviando}
            />
          </div>
        )}

        <div className="campo">
          <label className="campo__rotulo" htmlFor="senha">
            {primeiro ? 'Crie sua senha' : 'Senha'}
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete={primeiro ? 'new-password' : 'current-password'}
            required
            minLength={primeiro ? 12 : undefined}
            value={senha}
            onChange={(e) => definirSenha(e.target.value)}
            disabled={bloqueado || enviando}
          />
          {primeiro &&
            (curta ? (
              <span className="campo__erro">Use pelo menos 12 caracteres.</span>
            ) : (
              <span className="campo__ajuda">Pelo menos 12 caracteres.</span>
            ))}
        </div>

        {primeiro && (
          <div className="campo">
            <label className="campo__rotulo" htmlFor="confirmacao">
              Repita a senha
            </label>
            <input
              id="confirmacao"
              name="confirmacao"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacao}
              onChange={(e) => definirConfirmacao(e.target.value)}
              disabled={bloqueado || enviando}
            />
            {divergem && <span className="campo__erro">As senhas não coincidem.</span>}
          </div>
        )}

        <button
          type="submit"
          className="botao botao--primario"
          disabled={bloqueado || enviando || !pronto}
        >
          {enviando
            ? primeiro
              ? 'Criando acesso…'
              : 'Entrando…'
            : primeiro
              ? 'Criar senha e entrar'
              : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
