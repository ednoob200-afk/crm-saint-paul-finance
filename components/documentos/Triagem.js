'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CONFIDENCIALIDADE, DIRETORIAS, PRIORIDADES, QUADROS, obterQuadro } from '@/lib/quadros'
import { formatarDataHora } from '@/lib/formato'
import { Artigo, Pastilha, Vazio } from '@/components/Base'
import RevisaoSugestao from '@/components/documentos/RevisaoSugestao'

const ROTULO_STATUS = {
  recebido: { rotulo: 'Recebido', cor: 'cinza' },
  triado: { rotulo: 'Triado, aguardando revisão', cor: 'ambar' },
  erro_triagem: { rotulo: 'Erro na triagem', cor: 'vermelho' },
  distribuido: { rotulo: 'Distribuído', cor: 'verde' },
  descartado: { rotulo: 'Descartado', cor: 'cinza' },
}

export default function Triagem({
  documentosIniciais,
  podeDistribuir,
  iaConfigurada,
  provedor,
  tiposLegiveisPelaIa,
  storageConfigurado,
  tamanhoMaximo,
  tiposAceitos,
}) {
  const router = useRouter()
  const [documentos, definirDocumentos] = useState(documentosIniciais || [])
  const [modo, definirModo] = useState('texto')
  const [nome, definirNome] = useState('')
  const [conteudo, definirConteudo] = useState('')
  const [arquivo, definirArquivo] = useState(null)
  const [confidencialidade, definirConfidencialidade] = useState('interno')
  const [enviando, definirEnviando] = useState(false)
  const [mensagem, definirMensagem] = useState(null)
  const [emRevisao, definirEmRevisao] = useState(null)
  const [triando, definirTriando] = useState(null)

  function substituir(documento) {
    definirDocumentos((atual) => {
      const existe = atual.some((d) => d.id === documento.id)
      return existe ? atual.map((d) => (d.id === documento.id ? documento : d)) : [documento, ...atual]
    })
  }

  async function enviarTexto(evento) {
    evento.preventDefault()
    if (enviando) return
    definirMensagem(null)
    definirEnviando(true)

    try {
      const resposta = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() || 'Texto colado', conteudo, confidencialidade }),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({
          tipo: 'erro',
          texto:
            corpo.erro ||
            (corpo.erros || []).map((e) => e.mensagem).join(' ') ||
            'Não foi possível receber o texto.',
        })
        return
      }

      substituir(corpo.documento)
      definirNome('')
      definirConteudo('')
      definirMensagem({ tipo: 'ok', texto: 'Texto recebido. Solicite a triagem quando quiser.' })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. O texto não foi recebido.' })
    } finally {
      definirEnviando(false)
    }
  }

  async function enviarArquivo(evento) {
    evento.preventDefault()
    if (enviando || !arquivo) return
    definirMensagem(null)

    if (arquivo.size > tamanhoMaximo) {
      definirMensagem({
        tipo: 'erro',
        texto: `Arquivo de ${(arquivo.size / 1024 / 1024).toFixed(1)} MB excede o limite de ${
          tamanhoMaximo / 1024 / 1024
        } MB.`,
      })
      return
    }

    definirEnviando(true)
    try {
      const dados = new FormData()
      dados.set('arquivo', arquivo)
      dados.set('confidencialidade', confidencialidade)

      const resposta = await fetch('/api/documentos', { method: 'POST', body: dados })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({ tipo: 'erro', texto: corpo.erro || 'Não foi possível enviar o arquivo.' })
        return
      }

      substituir(corpo.documento)
      definirArquivo(null)
      evento.target.reset()
      definirMensagem({ tipo: 'ok', texto: 'Arquivo recebido. Solicite a triagem quando quiser.' })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. O arquivo não foi enviado.' })
    } finally {
      definirEnviando(false)
    }
  }

  async function triar(documento) {
    definirMensagem(null)
    definirTriando(documento.id)
    try {
      const resposta = await fetch(`/api/documentos/${documento.id}/triagem`, { method: 'POST' })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({ tipo: 'erro', texto: corpo.erro || 'A triagem falhou.' })
        // Recarrega para exibir o erro registrado no documento.
        if (corpo.codigo !== 'chave_ausente') router.refresh()
        return
      }

      substituir(corpo.documento)
      definirEmRevisao({
        documento: corpo.documento,
        sugestao: corpo.sugestao,
        avisos: corpo.avisos || [],
        truncado: corpo.truncado,
        modelo: corpo.modelo,
      })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. A triagem não foi concluída.' })
    } finally {
      definirTriando(null)
    }
  }

  function revisarNovamente(documento) {
    const sugestao = documento.sugestao_ia || {}
    definirEmRevisao({
      documento,
      sugestao,
      avisos: sugestao._avisos || [],
      truncado: Boolean(sugestao._truncado),
      modelo: documento.modelo_ia,
    })
  }

  async function distribuir(sugestao) {
    if (!emRevisao) return { ok: false, mensagem: 'Nada em revisão.' }
    try {
      const resposta = await fetch(`/api/documentos/${emRevisao.documento.id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sugestao }),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        return {
          ok: false,
          erros: corpo.erros,
          mensagem: corpo.erro || 'Não foi possível distribuir.',
        }
      }

      definirEmRevisao(null)
      definirMensagem({
        tipo: 'ok',
        texto: `Item criado em ${obterQuadro(corpo.quadro)?.nome || corpo.quadro}: ${corpo.item.titulo}.`,
      })
      router.refresh()
      return { ok: true }
    } catch {
      return { ok: false, mensagem: 'Falha de rede. Nada foi distribuído.' }
    }
  }

  async function descartar(documento) {
    definirMensagem(null)
    try {
      const resposta = await fetch(`/api/documentos/${documento.id}`, { method: 'DELETE' })
      const corpo = await resposta.json().catch(() => ({}))
      if (!resposta.ok) {
        definirMensagem({ tipo: 'erro', texto: corpo.erro || 'Não foi possível descartar.' })
        return
      }
      definirDocumentos((atual) =>
        atual.map((d) => (d.id === documento.id ? { ...d, status: 'descartado' } : d)),
      )
      if (emRevisao?.documento.id === documento.id) definirEmRevisao(null)
      definirMensagem({ tipo: 'ok', texto: 'Sugestão descartada. O registro do documento é preservado.' })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. Nada foi descartado.' })
    }
  }

  return (
    <div className="pilha">
      {!iaConfigurada && (
        <div className="aviso aviso--atencao">
          <strong>Triagem automática indisponível.</strong> Falta a variável de ambiente{' '}
          <code>{provedor.nome === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GROQ_API_KEY'}</code>.
          Adicione a chave no projeto da Vercel e reimplante. O recebimento de documentos e a
          classificação manual continuam funcionando.
        </div>
      )}

      {!storageConfigurado && (
        <div className="aviso aviso--atencao">
          <strong>Armazenamento de arquivos indisponível.</strong> Falta{' '}
          <code>BLOB_READ_WRITE_TOKEN</code>. PDF e imagem exigem storage porque a função da Vercel
          não guarda arquivos. Use “Colar texto” enquanto isso.
        </div>
      )}

      {iaConfigurada && !provedor.lePdf && (
        <div className="aviso aviso--atencao">
          <strong>PDF não é lido automaticamente.</strong> O provedor em uso ({provedor.rotulo},
          modelo <span className="mono">{provedor.modelo}</span>) não interpreta PDF. O arquivo pode
          ser enviado e fica guardado, mas para triar abra o documento, copie o texto e use “Colar
          texto”. Formatos que a IA lê sozinha:{' '}
          <span className="mono">{tiposLegiveisPelaIa.join(', ') || 'nenhum'}</span>, além de
          arquivos de texto.
        </div>
      )}

      {iaConfigurada && !provedor.temCacheDePrompt && (
        <div className="aviso">
          O provedor em uso não tem cache de prompt, então cada triagem recebe os artigos do
          Estatuto selecionados por relevância, e não o texto integral. A sugestão indica quantos
          artigos foram considerados — confira a base estatutária antes de distribuir.
        </div>
      )}

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
          <h2>Receber documento</h2>
          {iaConfigurada && (
            <span className="terciario mono">
              {provedor.rotulo} · {provedor.modelo}
            </span>
          )}
        </div>

        <div className="abas" role="tablist" aria-label="Forma de envio">
          <button
            type="button"
            role="tab"
            className="abas__botao"
            aria-selected={modo === 'texto'}
            onClick={() => definirModo('texto')}
          >
            Colar texto
          </button>
          <button
            type="button"
            role="tab"
            className="abas__botao"
            aria-selected={modo === 'arquivo'}
            onClick={() => definirModo('arquivo')}
          >
            Enviar arquivo
          </button>
        </div>

        <div className="campo" style={{ maxWidth: '260px', marginBottom: '12px' }}>
          <label className="campo__rotulo" htmlFor="conf">
            Confidencialidade do documento
          </label>
          <select
            id="conf"
            value={confidencialidade}
            onChange={(e) => definirConfidencialidade(e.target.value)}
          >
            {CONFIDENCIALIDADE.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
          <span className="campo__ajuda">
            Art. 96º e Art. 97º §1º: o acesso fica restrito a quem tem necessidade funcional.
          </span>
        </div>

        {modo === 'texto' ? (
          <form onSubmit={enviarTexto} className="pilha--apertada">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="doc-nome">
                Identificação do documento
              </label>
              <input
                id="doc-nome"
                type="text"
                value={nome}
                placeholder="Ata da reunião de 12/09, proposta da gestora X…"
                onChange={(e) => definirNome(e.target.value)}
              />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor="doc-conteudo">
                Conteúdo
              </label>
              <textarea
                id="doc-conteudo"
                rows={8}
                required
                minLength={20}
                value={conteudo}
                onChange={(e) => definirConteudo(e.target.value)}
              />
              <span className="campo__ajuda">Mínimo de 20 caracteres.</span>
            </div>
            <div className="barra-acoes">
              <button
                type="submit"
                className="botao botao--primario"
                disabled={enviando || conteudo.trim().length < 20}
              >
                {enviando ? 'Enviando…' : 'Receber documento'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={enviarArquivo} className="pilha--apertada">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="doc-arquivo">
                Arquivo
              </label>
              <input
                id="doc-arquivo"
                type="file"
                accept={tiposAceitos.join(',')}
                onChange={(e) => definirArquivo(e.target.files?.[0] || null)}
              />
              <span className="campo__ajuda">
                Aceitos: {tiposAceitos.join(', ')}. Limite de {tamanhoMaximo / 1024 / 1024} MB.
                Arquivos de texto têm o conteúdo extraído no envio.{' '}
                {provedor.lePdf
                  ? 'PDF e imagem são lidos pelo próprio modelo.'
                  : 'PDF fica guardado, mas não é lido pela IA: para triar, cole o texto.'}
              </span>
            </div>
            <div className="barra-acoes">
              <button
                type="submit"
                className="botao botao--primario"
                disabled={enviando || !arquivo}
              >
                {enviando ? 'Enviando…' : 'Enviar arquivo'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="cartao">
        <div className="cartao__titulo">
          <h2>Documentos recebidos</h2>
          <span className="terciario">{documentos.length} registro(s)</span>
        </div>

        {documentos.length === 0 ? (
          <Vazio titulo="Nenhum documento recebido">
            <p className="sem-margem">
              Cole um texto ou envie um arquivo acima. A IA sugere título, tipo, diretoria
              competente, quadro de destino, confidencialidade e artigos aplicáveis; nada é
              distribuído sem aprovação humana.
            </p>
          </Vazio>
        ) : (
          <div className="rolagem-horizontal">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th scope="col">Documento</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Recebido</th>
                  <th scope="col">Aprovação</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => {
                  const situacao = ROTULO_STATUS[d.status] || { rotulo: d.status, cor: 'cinza' }
                  const sugestao = d.sugestao_ia || null
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="quebra">{d.nome}</div>
                        <div className="terciario pequeno mono">
                          {d.tipo_arquivo}
                          {d.tamanho ? ` · ${Math.max(1, Math.round(d.tamanho / 1024))} KB` : ''}
                        </div>
                        {d.url && (
                          <a
                            className="pequeno"
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir documento
                          </a>
                        )}
                        {sugestao?.artigosAplicaveis?.length > 0 && (
                          <div className="linha" style={{ marginTop: '4px' }}>
                            {sugestao.artigosAplicaveis.map((a, i) => (
                              <Artigo key={i} rotulo={a.artigo} justificativa={a.justificativa} />
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <Pastilha cor={situacao.cor}>{situacao.rotulo}</Pastilha>
                        {d.erro_ia && (
                          <div className="pequeno" style={{ marginTop: '4px' }}>
                            <span className="quebra">{d.erro_ia}</span>
                          </div>
                        )}
                      </td>
                      <td className="pequeno mono">
                        {formatarDataHora(d.criado_em)}
                        <br />
                        <span className="terciario">{d.criado_por}</span>
                      </td>
                      <td className="pequeno">
                        {d.aprovado_por ? (
                          <>
                            {d.aprovado_por}
                            <br />
                            <span className="terciario mono">
                              {formatarDataHora(d.aprovado_em)}
                            </span>
                          </>
                        ) : (
                          <span className="terciario">Pendente</span>
                        )}
                      </td>
                      <td>
                        <div className="barra-acoes">
                          {d.status !== 'distribuido' && d.status !== 'descartado' && (
                            <button
                              type="button"
                              className="botao botao--pequeno"
                              disabled={!iaConfigurada || triando === d.id}
                              onClick={() => triar(d)}
                            >
                              {triando === d.id
                                ? 'Triando…'
                                : d.sugestao_ia
                                  ? 'Reprocessar'
                                  : 'Solicitar triagem'}
                            </button>
                          )}
                          {sugestao && d.status !== 'distribuido' && (
                            <button
                              type="button"
                              className="botao botao--pequeno"
                              onClick={() => revisarNovamente(d)}
                            >
                              Revisar
                            </button>
                          )}
                          {d.status !== 'distribuido' && d.status !== 'descartado' && (
                            <button
                              type="button"
                              className="botao botao--pequeno botao--perigo"
                              onClick={() => descartar(d)}
                            >
                              Descartar
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
      </section>

      {emRevisao && (
        <RevisaoSugestao
          documento={emRevisao.documento}
          sugestaoOriginal={emRevisao.sugestao}
          avisos={emRevisao.avisos}
          truncado={emRevisao.truncado}
          modelo={emRevisao.modelo}
          podeDistribuir={podeDistribuir}
          quadros={QUADROS}
          diretorias={DIRETORIAS}
          prioridades={PRIORIDADES}
          confidencialidades={CONFIDENCIALIDADE}
          aoFechar={() => definirEmRevisao(null)}
          aoDistribuir={distribuir}
          aoDescartar={() => descartar(emRevisao.documento)}
        />
      )}
    </div>
  )
}
