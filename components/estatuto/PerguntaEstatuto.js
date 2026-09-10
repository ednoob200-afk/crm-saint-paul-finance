'use client'

import { useState } from 'react'
import { Artigo, Citacao } from '@/components/Base'

export default function PerguntaEstatuto() {
  const [pergunta, definirPergunta] = useState('')
  const [enviando, definirEnviando] = useState(false)
  const [resposta, definirResposta] = useState(null)
  const [erro, definirErro] = useState(null)

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando || pergunta.trim().length < 5) return

    definirEnviando(true)
    definirErro(null)
    definirResposta(null)

    try {
      const chamada = await fetch('/api/estatuto/pergunta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: pergunta.trim() }),
      })
      const corpo = await chamada.json().catch(() => ({}))

      if (!chamada.ok) {
        definirErro(
          corpo.erro ||
            (corpo.erros || []).map((e) => e.mensagem).join(' ') ||
            'Não foi possível consultar.',
        )
        return
      }
      definirResposta(corpo)
    } catch {
      definirErro('Falha de rede. Tente novamente.')
    } finally {
      definirEnviando(false)
    }
  }

  return (
    <div className="pilha">
      <form onSubmit={enviar} className="pilha--apertada">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="pergunta">
            Pergunta
          </label>
          <textarea
            id="pergunta"
            rows={3}
            value={pergunta}
            placeholder="Quem aprova uma parceria com patrocínio? Qual o quórum para alterar o Estatuto?"
            onChange={(e) => definirPergunta(e.target.value)}
          />
          <span className="campo__ajuda">
            A resposta usa apenas o Estatuto vigente, cita os artigos e separa fato estatutário de
            interpretação. Quando não há base suficiente, a consulta diz isso em vez de supor.
          </span>
        </div>
        <div className="barra-acoes">
          <button
            type="submit"
            className="botao botao--primario"
            disabled={enviando || pergunta.trim().length < 5}
          >
            {enviando ? 'Consultando…' : 'Consultar'}
          </button>
          {(resposta || erro) && (
            <button
              type="button"
              className="botao botao--discreto"
              onClick={() => {
                definirResposta(null)
                definirErro(null)
              }}
            >
              Limpar resposta
            </button>
          )}
        </div>
      </form>

      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}

      {resposta && (
        <div className="pilha">
          {!resposta.baseSuficiente && (
            <div className="aviso aviso--atencao">
              <strong>Base estatutária insuficiente.</strong> Este é caso omisso: encaminhe à
              Presidência, na forma do Art. 120º II.
            </div>
          )}

          <div>
            <h3>Resposta</h3>
            <p className="texto-longo sem-margem">{resposta.resposta}</p>
          </div>

          {resposta.fatosEstatutarios?.length > 0 && (
            <div>
              <h3>Fatos estatutários</h3>
              <ul className="pequeno" style={{ margin: 0, paddingLeft: '1.2em' }}>
                {resposta.fatosEstatutarios.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {resposta.interpretacao && (
            <div>
              <h3>Interpretação</h3>
              <p className="texto-longo sem-margem secundario">{resposta.interpretacao}</p>
            </div>
          )}

          {resposta.observacao && <div className="aviso">{resposta.observacao}</div>}

          {resposta.artigosInexistentes?.length > 0 && (
            <div className="aviso aviso--atencao">
              Referência(s) descartada(s) por não constar(em) do Estatuto vigente:{' '}
              {resposta.artigosInexistentes.join(', ')}.
            </div>
          )}

          {resposta.artigosCitados?.length > 0 && (
            <div>
              <h3>Artigos citados</h3>
              <div className="artigo-lista">
                {resposta.artigosCitados.map((a) => (
                  <Citacao
                    key={a.rotulo}
                    rotulo={`${a.rotulo} — Capítulo ${a.capitulo}, ${a.capituloTitulo}`}
                  >
                    {a.texto}
                  </Citacao>
                ))}
              </div>
              <p className="linha" style={{ marginTop: '10px' }}>
                {resposta.artigosCitados.map((a) => (
                  <Artigo key={a.rotulo} rotulo={a.rotulo} />
                ))}
              </p>
            </div>
          )}

          <p className="terciario sem-margem mono">
            Resposta gerada por {resposta.modelo}. Conforme o Art. 100º e o Art. 110º, a
            responsabilidade pela decisão permanece humana.
          </p>
        </div>
      )}
    </div>
  )
}
