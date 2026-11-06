'use client'

import { useMemo, useState } from 'react'
import { DIRETORIAS, NIVEL_PAPEL, PAPEIS } from '@/lib/quadros'
import { formatarDataHora } from '@/lib/formato'
import { Pastilha } from '@/components/Base'

/** Descrição em linguagem simples do que cada papel permite fazer. */
const O_QUE_PODE = {
  administrador: 'Configura o sistema e gerencia todos os acessos.',
  presidencia: 'Vê tudo, gerencia acessos, aprova e decide as matérias estratégicas.',
  vice_presidencia:
    'Acompanha prazos, riscos e blockers de todas as frentes, e lê inclusive o nível restrito.',
  diretor: 'Cria, edita e exclui itens dos quadros, e distribui documentos triados pela IA.',
  colaborador: 'Cria e edita itens dos quadros. Não distribui documento nem exclui item.',
  leitor: 'Só consulta. Não altera nada.',
}

function situacaoDaEntrada(entrada) {
  if (!entrada.ativo) return { rotulo: 'Revogado', cor: 'vermelho' }
  if (entrada.ativado_em) return { rotulo: 'Ativo', cor: 'verde' }
  if (entrada.convite_pendente) {
    const expirado =
      entrada.convite_expira_em && new Date(entrada.convite_expira_em) < new Date()
    return expirado
      ? { rotulo: 'Link expirado', cor: 'ambar' }
      : { rotulo: 'Link enviado', cor: 'azul' }
  }
  if (entrada.primeiro_acesso_livre) {
    return { rotulo: 'Pode entrar', cor: 'azul' }
  }
  return { rotulo: 'Aguardando link', cor: 'ambar' }
}

function BotaoCopiar({ texto, rotulo = 'Copiar', className = 'botao botao--pequeno' }) {
  const [copiado, definirCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      definirCopiado(true)
      window.setTimeout(() => definirCopiado(false), 2500)
    } catch {
      // Alguns navegadores negam a área de transferência. O texto fica
      // visível ao lado, para seleção manual.
      definirCopiado(false)
    }
  }

  return (
    <button type="button" className={className} onClick={copiar}>
      {copiado ? 'Copiado' : rotulo}
    </button>
  )
}

export default function ListaAcesso({ entradasIniciais, papelAtual, emailAtual }) {
  const [entradas, definirEntradas] = useState(entradasIniciais || [])
  const [emails, definirEmails] = useState('')
  const [papel, definirPapel] = useState('colaborador')
  const [diretoria, definirDiretoria] = useState('')
  const [observacao, definirObservacao] = useState('')
  const [exigirLink, definirExigirLink] = useState(false)
  const [enviando, definirEnviando] = useState(false)
  const [mensagem, definirMensagem] = useState(null)
  const [recemAdicionados, definirRecemAdicionados] = useState(null)
  const [links, definirLinks] = useState([])
  const [busca, definirBusca] = useState('')

  const nivelAtual = NIVEL_PAPEL[papelAtual] || 0
  const papeisDisponiveis = PAPEIS.filter((p) => p.nivel <= nivelAtual)

  const quantidade = useMemo(
    () => emails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean).length,
    [emails],
  )

  const filtradas = useMemo(() => {
    const alvo = busca.trim().toLowerCase()
    if (!alvo) return entradas
    return entradas.filter(
      (e) =>
        e.email.toLowerCase().includes(alvo) ||
        (e.nome || '').toLowerCase().includes(alvo) ||
        (e.observacao || '').toLowerCase().includes(alvo),
    )
  }, [entradas, busca])

  async function adicionar(evento) {
    evento.preventDefault()
    if (enviando || quantidade === 0) return
    definirMensagem(null)
    definirEnviando(true)

    try {
      const resposta = await fetch('/api/lista-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          papel,
          diretoria: diretoria || null,
          observacao,
          primeiroAcessoLivre: !exigirLink,
        }),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({
          tipo: 'erro',
          texto:
            corpo.erro ||
            (corpo.erros || []).map((e) => e.mensagem).join(' ') ||
            'Não foi possível adicionar.',
        })
        return
      }

      definirEntradas(corpo.entradas || [])
      definirEmails('')
      definirObservacao('')

      if (corpo.criados?.length) {
        definirRecemAdicionados({
          entradas: corpo.criados,
          url: corpo.urlPrimeiroAcesso,
          exigeLink: exigirLink,
        })
      }

      const partes = []
      if (corpo.jaExistiam?.length) {
        partes.push(`${corpo.jaExistiam.length} já estava(m) na lista: ${corpo.jaExistiam.join(', ')}`)
      }
      if (corpo.invalidos?.length) {
        partes.push(`${corpo.invalidos.length} ignorado(s) por formato: ${corpo.invalidos.join(', ')}`)
      }
      if (partes.length > 0) {
        definirMensagem({ tipo: 'atencao', texto: `${partes.join('. ')}.` })
      }
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. Nada foi adicionado.' })
    } finally {
      definirEnviando(false)
    }
  }

  async function alterar(id, alteracoes, descricao) {
    definirMensagem(null)
    try {
      const resposta = await fetch(`/api/lista-acesso/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alteracoes),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({ tipo: 'erro', texto: corpo.erro || 'Não foi possível alterar.' })
        return
      }

      definirEntradas((atual) => atual.map((e) => (e.id === id ? corpo.entrada : e)))

      if (corpo.linkAtivacao) {
        definirLinks([{ ...corpo.entrada, linkAtivacao: corpo.linkAtivacao }])
        definirMensagem({
          tipo: 'ok',
          texto: 'Link gerado. Copie agora: ele não pode ser recuperado depois.',
        })
      } else if (descricao) {
        definirMensagem({ tipo: 'ok', texto: descricao })
      }
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. Nada foi alterado.' })
    }
  }

  async function excluir(id, email) {
    definirMensagem(null)
    try {
      const resposta = await fetch(`/api/lista-acesso/${id}`, { method: 'DELETE' })
      const corpo = await resposta.json().catch(() => ({}))
      if (!resposta.ok) {
        definirMensagem({ tipo: 'erro', texto: corpo.erro || 'Não foi possível remover.' })
        return
      }
      definirEntradas((atual) => atual.filter((e) => e.id !== id))
      definirMensagem({ tipo: 'ok', texto: `${email} removido da lista.` })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. Nada foi removido.' })
    }
  }

  return (
    <div className="pilha">
      <section className="cartao">
        <div className="cartao__titulo">
          <h2>Lista de acesso</h2>
          <span className="terciario">{entradas.length} pessoa(s)</span>
        </div>

        <p className="sem-margem secundario">
          Só quem está nesta lista consegue entrar no sistema. Adicione o e-mail e escolha o que a
          pessoa pode fazer. Ela então vai à tela de acesso, abre <strong>Primeiro acesso</strong> e
          cria a própria senha — ninguém distribui senha, e nem a Presidência conhece a senha de
          outra pessoa. Revogar aqui encerra o acesso na hora, inclusive as sessões abertas. <strong>Reiniciar acesso</strong> apaga a senha da pessoa para que ela crie uma nova, como no primeiro acesso.
        </p>

        {mensagem && (
          <div
            className={`aviso ${
              mensagem.tipo === 'erro'
                ? 'aviso--erro'
                : mensagem.tipo === 'atencao'
                  ? 'aviso--atencao'
                  : 'aviso--ok'
            }`}
            role="alert"
            style={{ marginTop: '12px' }}
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

        <form onSubmit={adicionar} className="pilha--apertada" style={{ marginTop: '14px' }}>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="la-emails">
              E-mails
            </label>
            <textarea
              id="la-emails"
              rows={4}
              value={emails}
              placeholder={
                'Um por linha, ou separados por vírgula:\n' +
                'joao.silva@saintpaul.edu.br\n' +
                'maria.souza@saintpaul.edu.br, ana.lima@saintpaul.edu.br'
              }
              onChange={(e) => definirEmails(e.target.value)}
              disabled={enviando}
            />
            <span className="campo__ajuda">
              {quantidade === 0
                ? 'Aceita vários de uma vez, até 50 por envio.'
                : `${quantidade} e-mail(s) reconhecido(s). Todos receberão o mesmo papel e a mesma diretoria.`}
            </span>
          </div>

          <div className="campos">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="la-papel">
                O que essa pessoa pode fazer
              </label>
              <select
                id="la-papel"
                value={papel}
                onChange={(e) => definirPapel(e.target.value)}
                disabled={enviando}
              >
                {papeisDisponiveis.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
              <span className="campo__ajuda">{O_QUE_PODE[papel]}</span>
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="la-diretoria">
                Diretoria
              </label>
              <select
                id="la-diretoria"
                value={diretoria}
                onChange={(e) => definirDiretoria(e.target.value)}
                disabled={enviando}
              >
                <option value="">Sem diretoria definida</option>
                {DIRETORIAS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.rotulo}
                  </option>
                ))}
              </select>
              <span className="campo__ajuda">
                A Diretoria Financeira não aparece: o Art. 33º VII a prevê apenas quando instituída.
              </span>
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="la-observacao">
                Observação
              </label>
              <input
                id="la-observacao"
                type="text"
                value={observacao}
                placeholder="Trainee 2026.2, diretor de Formação…"
                onChange={(e) => definirObservacao(e.target.value)}
                disabled={enviando}
              />
            </div>
          </div>

          <fieldset>
            <legend>Como essa pessoa vai criar a senha</legend>
            <label className="linha pequeno" style={{ alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={exigirLink}
                onChange={(e) => definirExigirLink(e.target.checked)}
                disabled={enviando}
              />
              <span>
                <strong>Exigir link de convite</strong> em vez do primeiro acesso direto.
                <br />
                <span className="secundario">
                  Sem marcar, qualquer pessoa que saiba um e-mail autorizado pode criar a senha
                  antes do titular — e-mails institucionais são previsíveis. A ativação fica na
                  trilha de auditoria com data, hora e IP, e a Presidência pode revogar. Marcando,
                  só entra quem receber o link, que você copia e envia por canal seguro.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="barra-acoes">
            <button
              type="submit"
              className="botao botao--primario"
              disabled={enviando || quantidade === 0}
            >
              {enviando
                ? 'Adicionando…'
                : quantidade > 1
                  ? `Adicionar ${quantidade} pessoas`
                  : 'Adicionar à lista'}
            </button>
          </div>
        </form>
      </section>

      {recemAdicionados && (
        <section className="cartao">
          <div className="cartao__titulo">
            <h2>
              {recemAdicionados.entradas.length} pessoa(s) adicionada(s)
            </h2>
            <button
              type="button"
              className="botao botao--discreto botao--pequeno"
              onClick={() => definirRecemAdicionados(null)}
            >
              Fechar
            </button>
          </div>

          {recemAdicionados.exigeLink ? (
            <div className="aviso aviso--atencao">
              Estas entradas exigem link de convite. Use <strong>Gerar link</strong> na tabela
              abaixo, pessoa por pessoa, e envie por canal seguro.
            </div>
          ) : (
            <>
              <div className="aviso aviso--ok">
                Pronto. Avise as pessoas para abrir o endereço abaixo, escolher{' '}
                <strong>Primeiro acesso</strong> e criar a própria senha com o e-mail autorizado.
              </div>
              <div className="entre" style={{ marginTop: '12px' }}>
                <span className="mono quebra crescer">{recemAdicionados.url}</span>
                <BotaoCopiar texto={recemAdicionados.url} rotulo="Copiar endereço" />
              </div>
            </>
          )}

          <div className="pilha--apertada" style={{ marginTop: '12px' }}>
            {recemAdicionados.entradas.map((e) => (
              <div className="pequeno quebra" key={e.id}>
                <strong>{e.email}</strong>
                <span className="terciario">
                  {' · '}
                  {PAPEIS.find((p) => p.valor === e.papel)?.rotulo || e.papel}
                </span>
              </div>
            ))}
          </div>

          <div className="barra-acoes" style={{ marginTop: '12px' }}>
            <BotaoCopiar
              texto={recemAdicionados.entradas.map((e) => e.email).join(', ')}
              rotulo="Copiar e-mails"
              className="botao"
            />
          </div>
        </section>
      )}

      {links.length > 0 && (
        <section className="cartao">
          <div className="cartao__titulo">
            <h2>Link de convite</h2>
            <button
              type="button"
              className="botao botao--discreto botao--pequeno"
              onClick={() => definirLinks([])}
            >
              Já copiei, ocultar
            </button>
          </div>
          <div className="aviso aviso--atencao">
            <strong>Copie agora.</strong> O sistema guarda apenas o hash do convite, então este link
            não pode ser recuperado depois — se perder, gere outro. Quem tiver o link define a senha
            daquele e-mail. Vale por 14 dias e serve uma única vez.
          </div>
          <div className="pilha--apertada" style={{ marginTop: '12px' }}>
            {links.map((l) => (
              <div className="entre" key={l.id}>
                <span className="crescer quebra">
                  <strong>{l.email}</strong>
                  <br />
                  <span className="mono pequeno quebra">{l.linkAtivacao}</span>
                </span>
                <BotaoCopiar texto={l.linkAtivacao} rotulo="Copiar link" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="cartao">
        <div className="cartao__titulo">
          <h2>Pessoas autorizadas</h2>
          <span className="terciario">
            {filtradas.length} de {entradas.length}
          </span>
        </div>

        <div className="campo" style={{ maxWidth: '320px', marginBottom: '12px' }}>
          <label className="campo__rotulo" htmlFor="la-busca">
            Buscar
          </label>
          <input
            id="la-busca"
            type="search"
            value={busca}
            placeholder="E-mail, nome ou observação"
            onChange={(e) => definirBusca(e.target.value)}
          />
        </div>

        {entradas.length === 0 ? (
          <p className="terciario sem-margem">
            Ninguém na lista ainda. Adicione o primeiro e-mail no formulário acima.
          </p>
        ) : (
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Pessoa</th>
                  <th scope="col">Pode fazer</th>
                  <th scope="col">Diretoria</th>
                  <th scope="col">Primeiro acesso</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((entrada) => {
                  const situacao = situacaoDaEntrada(entrada)
                  const proprio = entrada.email.toLowerCase() === (emailAtual || '').toLowerCase()
                  const papelNaLista = papeisDisponiveis.some((p) => p.valor === entrada.papel)
                  return (
                    <tr key={entrada.id}>
                      <td>
                        <div className="quebra">{entrada.nome || entrada.email}</div>
                        {entrada.nome && (
                          <div className="mono pequeno quebra terciario">{entrada.email}</div>
                        )}
                        {entrada.observacao && (
                          <div className="pequeno secundario quebra">{entrada.observacao}</div>
                        )}
                        {proprio && <div className="pequeno terciario">É você</div>}
                      </td>
                      <td>
                        <select
                          value={entrada.papel}
                          disabled={proprio}
                          aria-label={`Papel de ${entrada.email}`}
                          onChange={(e) =>
                            alterar(
                              entrada.id,
                              { papel: e.target.value },
                              'Papel alterado. As sessões abertas dessa pessoa foram encerradas.',
                            )
                          }
                        >
                          {papeisDisponiveis.map((p) => (
                            <option key={p.valor} value={p.valor}>
                              {p.rotulo}
                            </option>
                          ))}
                          {!papelNaLista && (
                            <option value={entrada.papel}>
                              {PAPEIS.find((p) => p.valor === entrada.papel)?.rotulo ||
                                entrada.papel}
                            </option>
                          )}
                        </select>
                        <div className="campo__ajuda">{O_QUE_PODE[entrada.papel]}</div>
                      </td>
                      <td>
                        <select
                          value={entrada.diretoria || ''}
                          aria-label={`Diretoria de ${entrada.email}`}
                          onChange={(e) =>
                            alterar(
                              entrada.id,
                              { diretoria: e.target.value || null },
                              'Diretoria alterada.',
                            )
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
                        {entrada.ativado_em ? (
                          <span className="terciario pequeno">Já ativado</span>
                        ) : (
                          <select
                            value={entrada.primeiro_acesso_livre ? 'direto' : 'link'}
                            aria-label={`Forma de primeiro acesso de ${entrada.email}`}
                            onChange={(e) =>
                              alterar(
                                entrada.id,
                                { primeiroAcessoLivre: e.target.value === 'direto' },
                                e.target.value === 'direto'
                                  ? 'Agora essa pessoa pode criar a senha direto na tela de acesso.'
                                  : 'Agora essa pessoa só entra com link de convite.',
                              )
                            }
                          >
                            <option value="direto">Direto na tela de acesso</option>
                            <option value="link">Só com link de convite</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <Pastilha cor={situacao.cor}>{situacao.rotulo}</Pastilha>
                        <div className="pequeno terciario mono" style={{ marginTop: '4px' }}>
                          {entrada.ativado_em
                            ? `${formatarDataHora(entrada.ativado_em)}${
                                entrada.ativado_por ? ` · ${entrada.ativado_por}` : ''
                              }`
                            : entrada.convite_expira_em
                              ? `Link até ${formatarDataHora(entrada.convite_expira_em)}`
                              : '—'}
                        </div>
                      </td>
                      <td>
                        <div className="barra-acoes">
                          {entrada.ativo && !entrada.ativado_em && (
                            <button
                              type="button"
                              className="botao botao--pequeno"
                              onClick={() => alterar(entrada.id, { novoConvite: true })}
                            >
                              {entrada.convite_pendente ? 'Gerar novo link' : 'Gerar link'}
                            </button>
                          )}
                          {!proprio && entrada.ativo && (
                            <button
                              type="button"
                              className="botao botao--pequeno botao--perigo"
                              onClick={() =>
                                alterar(
                                  entrada.id,
                                  { ativo: false },
                                  'Acesso revogado. As sessões abertas foram encerradas.',
                                )
                              }
                            >
                              Revogar acesso
                            </button>
                          )}
                          {!entrada.ativo && (
                            <button
                              type="button"
                              className="botao botao--pequeno"
                              onClick={() =>
                                alterar(entrada.id, { ativo: true }, 'Acesso reativado.')
                              }
                            >
                              Reativar
                            </button>
                          )}
                          {!proprio && entrada.ativado_em && (
                            <button
                              type="button"
                              className="botao botao--pequeno"
                              title="A senha atual deixa de valer e a pessoa cria uma nova, como no primeiro acesso."
                              onClick={() => {
                                const confirmado = window.confirm(
                                  `Reiniciar o acesso de ${entrada.email}?\n\n` +
                                    'A senha atual deixa de valer, as sessões abertas são encerradas e a ' +
                                    'pessoa precisará criar uma nova senha. O histórico é preservado.',
                                )
                                if (!confirmado) return
                                alterar(
                                  entrada.id,
                                  { reiniciar: true },
                                  entrada.primeiro_acesso_livre
                                    ? 'Acesso reiniciado. A pessoa já pode criar uma nova senha em "Primeiro acesso", na tela de acesso.'
                                    : 'Acesso reiniciado. Esta entrada exige link de convite: use "Gerar link" e envie à pessoa.',
                                )
                              }}
                            >
                              Reiniciar acesso
                            </button>
                          )}
                          {!entrada.ativado_em && (
                            <button
                              type="button"
                              className="botao botao--pequeno botao--discreto"
                              onClick={() => excluir(entrada.id, entrada.email)}
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="campo__ajuda" style={{ marginTop: '10px' }}>
          Quem já ativou o acesso não é removido da lista: é revogado ou tem o acesso reiniciado, para preservar a memória
          institucional (Art. 42º VIII e Art. 72º parágrafo único). Você não pode alterar o seu
          próprio papel nem revogar ou reiniciar o seu próprio acesso.
        </p>
      </section>
    </div>
  )
}
