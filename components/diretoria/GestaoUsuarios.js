'use client'

import { useState } from 'react'
import { DIRETORIAS, NIVEL_PAPEL, PAPEIS } from '@/lib/quadros'
import { formatarDataHora } from '@/lib/formato'
import { Pastilha } from '@/components/Base'

const NOVO_VAZIO = {
  nome: '',
  email: '',
  senha: '',
  papel: 'colaborador',
  diretoria: '',
}

export default function GestaoUsuarios({ usuariosIniciais, papelAtual, idAtual }) {
  const [usuarios, definirUsuarios] = useState(usuariosIniciais || [])
  const [novo, definirNovo] = useState(NOVO_VAZIO)
  const [criando, definirCriando] = useState(false)
  const [mensagem, definirMensagem] = useState(null)

  const nivelAtual = NIVEL_PAPEL[papelAtual] || 0
  const papeisDisponiveis = PAPEIS.filter((p) => p.nivel <= nivelAtual)

  async function criar(evento) {
    evento.preventDefault()
    if (criando) return
    definirMensagem(null)
    definirCriando(true)

    try {
      const resposta = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novo, diretoria: novo.diretoria || null }),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({
          tipo: 'erro',
          texto:
            corpo.erro ||
            (corpo.erros || []).map((e) => `${e.campo}: ${e.mensagem}`).join(' ') ||
            'Não foi possível criar o usuário.',
        })
        return
      }

      definirUsuarios((atual) => [...atual, corpo.usuario])
      definirNovo(NOVO_VAZIO)
      definirMensagem({ tipo: 'ok', texto: `Usuário ${corpo.usuario.email} criado.` })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. O usuário não foi criado.' })
    } finally {
      definirCriando(false)
    }
  }

  async function atualizar(id, alteracoes, descricao) {
    definirMensagem(null)
    try {
      const resposta = await fetch(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alteracoes),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({ tipo: 'erro', texto: corpo.erro || 'Não foi possível atualizar.' })
        return
      }

      definirUsuarios((atual) => atual.map((u) => (u.id === id ? corpo.usuario : u)))
      definirMensagem({ tipo: 'ok', texto: descricao || 'Usuário atualizado.' })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. Nada foi alterado.' })
    }
  }

  return (
    <div className="pilha">
      {mensagem && (
        <div
          className={`aviso ${mensagem.tipo === 'erro' ? 'aviso--erro' : 'aviso--ok'}`}
          role="alert"
        >
          <div className="entre">
            <span>{mensagem.texto}</span>
            <button
              type="button"
              className="botao botao--discreto botao--pequeno"
              onClick={() => definirMensagem(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <section className="cartao">
        <div className="cartao__titulo">
          <h2>Usuários do sistema</h2>
          <span className="terciario">{usuarios.length} registro(s)</span>
        </div>

        <div className="rolagem-horizontal">
          <table className="tabela-simples">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Papel</th>
                <th scope="col">Diretoria</th>
                <th scope="col">Situação</th>
                <th scope="col">Criado</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const proprio = u.id === idAtual
                return (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td className="mono pequeno quebra">{u.email}</td>
                    <td>
                      <select
                        value={u.papel}
                        disabled={proprio}
                        aria-label={`Papel de ${u.nome}`}
                        onChange={(e) =>
                          atualizar(u.id, { papel: e.target.value }, 'Papel alterado. As sessões abertas foram revogadas.')
                        }
                      >
                        {papeisDisponiveis.map((p) => (
                          <option key={p.valor} value={p.valor}>
                            {p.rotulo}
                          </option>
                        ))}
                        {!papeisDisponiveis.some((p) => p.valor === u.papel) && (
                          <option value={u.papel}>
                            {PAPEIS.find((p) => p.valor === u.papel)?.rotulo || u.papel}
                          </option>
                        )}
                      </select>
                    </td>
                    <td>
                      <select
                        value={u.diretoria || ''}
                        aria-label={`Diretoria de ${u.nome}`}
                        onChange={(e) =>
                          atualizar(u.id, { diretoria: e.target.value || null }, 'Diretoria alterada.')
                        }
                      >
                        <option value="">—</option>
                        {DIRETORIAS.map((d) => (
                          <option key={d.valor} value={d.valor}>
                            {d.rotulo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {u.ativo ? (
                        <Pastilha cor="verde">Ativo</Pastilha>
                      ) : (
                        <Pastilha cor="cinza">Inativo</Pastilha>
                      )}
                    </td>
                    <td className="mono pequeno">{formatarDataHora(u.criado_em)}</td>
                    <td>
                      <button
                        type="button"
                        className="botao botao--pequeno"
                        disabled={proprio}
                        onClick={() =>
                          atualizar(
                            u.id,
                            { ativo: !u.ativo },
                            u.ativo
                              ? 'Acesso revogado. As sessões abertas foram encerradas.'
                              : 'Acesso reativado.',
                          )
                        }
                      >
                        {u.ativo ? 'Revogar acesso' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="campo__ajuda" style={{ marginTop: '10px' }}>
          Você não pode alterar o seu próprio papel nem desativar o seu próprio acesso. Trocar papel,
          senha ou desativar encerra as sessões abertas daquele usuário.
        </p>
      </section>

      <section className="cartao">
        <div className="cartao__titulo">
          <h2>Novo usuário</h2>
        </div>
        <form onSubmit={criar} className="pilha--apertada">
          <div className="campos">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="u-nome">
                Nome
              </label>
              <input
                id="u-nome"
                type="text"
                required
                value={novo.nome}
                onChange={(e) => definirNovo({ ...novo, nome: e.target.value })}
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="u-email">
                E-mail
              </label>
              <input
                id="u-email"
                type="email"
                required
                value={novo.email}
                onChange={(e) => definirNovo({ ...novo, email: e.target.value })}
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="u-senha">
                Senha inicial
              </label>
              <input
                id="u-senha"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={novo.senha}
                onChange={(e) => definirNovo({ ...novo, senha: e.target.value })}
              />
              <span className="campo__ajuda">
                Mínimo de 12 caracteres. É guardada apenas como hash scrypt. Entregue a senha por
                canal seguro e peça a troca no primeiro acesso.
              </span>
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="u-papel">
                Papel
              </label>
              <select
                id="u-papel"
                value={novo.papel}
                onChange={(e) => definirNovo({ ...novo, papel: e.target.value })}
              >
                {papeisDisponiveis.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="u-diretoria">
                Diretoria
              </label>
              <select
                id="u-diretoria"
                value={novo.diretoria}
                onChange={(e) => definirNovo({ ...novo, diretoria: e.target.value })}
              >
                <option value="">—</option>
                {DIRETORIAS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="barra-acoes">
            <button type="submit" className="botao botao--primario" disabled={criando}>
              {criando ? 'Criando…' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
