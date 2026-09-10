'use client'

import { useMemo, useState } from 'react'
import {
  DIRETORIAS,
  obterQuadro,
  podeAdministrar,
  podeMutar,
  rotuloDiretoria,
} from '@/lib/quadros'
import { montarAlteracao, situacaoDoPrazo } from '@/lib/formato'
import { NotaEstatutaria, Vazio } from '@/components/Base'
import Tabela from '@/components/quadro/Tabela'
import Kanban from '@/components/quadro/Kanban'
import Cronograma from '@/components/quadro/Cronograma'
import Gaveta from '@/components/quadro/Gaveta'
import NovoItem from '@/components/quadro/NovoItem'

const ABAS = [
  { chave: 'tabela', rotulo: 'Tabela' },
  { chave: 'kanban', rotulo: 'Kanban' },
  { chave: 'cronograma', rotulo: 'Cronograma' },
]

const FILTRO_VAZIO = {
  status: '',
  diretoria: '',
  responsavel: '',
  prazo: '',
  busca: '',
}

export default function QuadroCliente({ slug, dadosIniciais, papel, pessoas }) {
  const quadro = obterQuadro(slug)

  const [grupos] = useState(dadosIniciais.grupos || [])
  const [itens, definirItens] = useState(dadosIniciais.itens || [])
  const [aba, definirAba] = useState('tabela')
  const [filtros, definirFiltros] = useState(FILTRO_VAZIO)
  const [recolhidos, definirRecolhidos] = useState(() => new Set())
  const [aberto, definirAberto] = useState(null)
  const [criando, definirCriando] = useState(null)
  const [mensagem, definirMensagem] = useState(null)
  const [salvando, definirSalvando] = useState(false)

  const somenteLeitura = !podeMutar(papel)
  const podeExcluir = podeAdministrar(papel) || papel === 'diretor'

  const responsaveis = useMemo(() => {
    const conjunto = new Set(itens.map((i) => i.responsavel).filter(Boolean))
    return [...conjunto].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [itens])

  const filtrados = useMemo(() => {
    const busca = filtros.busca.trim().toLowerCase()
    return itens.filter((item) => {
      if (filtros.status && item.status !== filtros.status) return false
      if (filtros.diretoria && item.diretoria !== filtros.diretoria) return false
      if (filtros.responsavel && item.responsavel !== filtros.responsavel) return false

      if (filtros.prazo) {
        const situacao = situacaoDoPrazo(item.prazo)
        if (filtros.prazo === 'sem_prazo' && situacao !== null) return false
        if (filtros.prazo === 'atrasado' && situacao !== 'vencida') return false
        if (filtros.prazo === 'proximo' && situacao !== 'proxima') return false
      }

      if (busca) {
        const alvo = [
          item.titulo,
          item.descricao,
          item.responsavel,
          item.co_responsavel,
          item.proximo_passo,
          item.risco,
          item.blocker,
          item.origem,
          ...Object.values(item.dados || {}).map((v) => (typeof v === 'string' ? v : '')),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(busca)) return false
      }

      return true
    })
  }, [itens, filtros])

  const itemAberto = aberto ? itens.find((i) => i.id === aberto) || null : null
  const filtroAtivo = Object.values(filtros).some((v) => v !== '')

  function alternarGrupo(chave) {
    definirRecolhidos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      return proximo
    })
  }

  /** Atualização otimista com reversão em caso de falha do servidor. */
  async function alterar(itemId, caminho, valor) {
    if (somenteLeitura) return
    const anterior = itens
    const normalizado = valor === '' ? null : valor

    definirItens((atual) =>
      atual.map((item) => {
        if (item.id !== itemId) return item
        if (caminho.startsWith('dados.')) {
          return {
            ...item,
            dados: { ...item.dados, [caminho.slice('dados.'.length)]: normalizado },
          }
        }
        return { ...item, [caminho]: normalizado }
      }),
    )

    definirSalvando(true)
    definirMensagem(null)

    try {
      const resposta = await fetch(`/api/itens/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(montarAlteracao(caminho, normalizado)),
      })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirItens(anterior)
        definirMensagem({
          tipo: 'erro',
          texto:
            corpo.erro ||
            (corpo.erros || []).map((e) => e.mensagem).join(' ') ||
            'Não foi possível salvar a alteração.',
        })
        return
      }

      // Servidor é a fonte de verdade: substitui o item pelo que voltou.
      definirItens((atual) => atual.map((i) => (i.id === itemId ? corpo.item : i)))
    } catch {
      definirItens(anterior)
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. A alteração não foi salva.' })
    } finally {
      definirSalvando(false)
    }
  }

  async function criar(corpo) {
    try {
      const resposta = await fetch(`/api/quadros/${slug}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const resultado = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        return {
          ok: false,
          erros: resultado.erros,
          mensagem: resultado.erro || 'Não foi possível criar o item.',
        }
      }

      definirItens((atual) => [...atual, resultado.item])
      definirCriando(null)
      definirMensagem({ tipo: 'ok', texto: 'Item criado.' })
      return { ok: true }
    } catch {
      return { ok: false, mensagem: 'Falha de rede. O item não foi criado.' }
    }
  }

  async function excluir(itemId) {
    try {
      const resposta = await fetch(`/api/itens/${itemId}`, { method: 'DELETE' })
      const corpo = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        definirMensagem({ tipo: 'erro', texto: corpo.erro || 'Não foi possível excluir.' })
        return
      }

      definirItens((atual) => atual.filter((i) => i.id !== itemId))
      definirAberto(null)
      definirMensagem({ tipo: 'ok', texto: 'Item excluído.' })
    } catch {
      definirMensagem({ tipo: 'erro', texto: 'Falha de rede. O item não foi excluído.' })
    }
  }

  if (!quadro) {
    return <div className="aviso aviso--erro">Quadro não encontrado.</div>
  }

  return (
    <div className="pilha">
      {quadro.notaEstatutaria && <NotaEstatutaria>{quadro.notaEstatutaria}</NotaEstatutaria>}

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

      <div className="entre">
        <div className="abas" role="tablist" aria-label="Visões do quadro">
          {ABAS.map((a) => (
            <button
              type="button"
              key={a.chave}
              role="tab"
              className="abas__botao"
              aria-selected={aba === a.chave}
              onClick={() => definirAba(a.chave)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        <div className="barra-acoes">
          {salvando && <span className="carregando">Salvando…</span>}
          {!somenteLeitura && (
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => definirCriando(grupos[0]?.id || null)}
            >
              Novo item
            </button>
          )}
        </div>
      </div>

      <div className="filtros">
        <div className="campo filtros__busca">
          <label className="campo__rotulo" htmlFor="filtro-busca">
            Busca por conteúdo
          </label>
          <input
            id="filtro-busca"
            type="search"
            value={filtros.busca}
            placeholder="Título, responsável, próximo passo, observações…"
            onChange={(e) => definirFiltros({ ...filtros, busca: e.target.value })}
          />
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="filtro-status">
            Status
          </label>
          <select
            id="filtro-status"
            value={filtros.status}
            onChange={(e) => definirFiltros({ ...filtros, status: e.target.value })}
          >
            <option value="">Todos</option>
            {(quadro.statusOpcoes || []).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="filtro-diretoria">
            Diretoria
          </label>
          <select
            id="filtro-diretoria"
            value={filtros.diretoria}
            onChange={(e) => definirFiltros({ ...filtros, diretoria: e.target.value })}
          >
            <option value="">Todas</option>
            {DIRETORIAS.map((d) => (
              <option key={d.valor} value={d.valor}>
                {rotuloDiretoria(d.valor)}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="filtro-responsavel">
            Responsável
          </label>
          <select
            id="filtro-responsavel"
            value={filtros.responsavel}
            onChange={(e) => definirFiltros({ ...filtros, responsavel: e.target.value })}
          >
            <option value="">Todos</option>
            {responsaveis.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="filtro-prazo">
            Prazo
          </label>
          <select
            id="filtro-prazo"
            value={filtros.prazo}
            onChange={(e) => definirFiltros({ ...filtros, prazo: e.target.value })}
          >
            <option value="">Qualquer</option>
            <option value="atrasado">Vencidos</option>
            <option value="proximo">Vencem em até 7 dias</option>
            <option value="sem_prazo">Sem prazo</option>
          </select>
        </div>

        {filtroAtivo && (
          <button
            type="button"
            className="botao botao--discreto"
            onClick={() => definirFiltros(FILTRO_VAZIO)}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <p className="terciario sem-margem">
        {filtrados.length} de {itens.length} item(ns)
        {filtroAtivo ? ' com os filtros aplicados' : ''}.
      </p>

      {itens.length === 0 ? (
        <Vazio titulo={`Nenhum registro em ${quadro.nome}`}>
          <p className="sem-margem">{quadro.descricao}</p>
          {!somenteLeitura ? (
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => definirCriando(grupos[0]?.id || null)}
            >
              Criar o primeiro item
            </button>
          ) : (
            <p className="sem-margem">
              Seu papel permite consulta. Peça acesso de colaborador à Presidência.
            </p>
          )}
        </Vazio>
      ) : (
        <>
          {aba === 'tabela' && (
            <Tabela
              quadro={quadro}
              grupos={grupos}
              itens={filtrados}
              pessoas={pessoas}
              somenteLeitura={somenteLeitura}
              recolhidos={recolhidos}
              aoAlternarGrupo={alternarGrupo}
              aoAlterar={alterar}
              aoAbrir={(item) => definirAberto(item.id)}
              aoNovoItem={(grupoId) => definirCriando(grupoId)}
              aoMoverGrupo={(itemId, grupoId) => alterar(itemId, 'grupo_id', grupoId)}
            />
          )}

          {aba === 'kanban' && (
            <Kanban
              quadro={quadro}
              grupos={grupos}
              itens={filtrados}
              somenteLeitura={somenteLeitura}
              aoAlterarStatus={(itemId, status) => alterar(itemId, 'status', status)}
              aoAbrir={(item) => definirAberto(item.id)}
            />
          )}

          {aba === 'cronograma' && (
            <Cronograma
              quadro={quadro}
              itens={filtrados}
              aoAbrir={(item) => definirAberto(item.id)}
            />
          )}
        </>
      )}

      {itemAberto && (
        <Gaveta
          quadro={quadro}
          item={itemAberto}
          grupos={grupos}
          pessoas={pessoas}
          somenteLeitura={somenteLeitura}
          podeExcluir={podeExcluir && !somenteLeitura}
          aoAlterar={alterar}
          aoFechar={() => definirAberto(null)}
          aoExcluir={excluir}
        />
      )}

      {criando !== null && (
        <NovoItem
          quadro={quadro}
          grupos={grupos}
          grupoInicial={criando}
          pessoas={pessoas}
          aoFechar={() => definirCriando(null)}
          aoCriar={criar}
        />
      )}
    </div>
  )
}
