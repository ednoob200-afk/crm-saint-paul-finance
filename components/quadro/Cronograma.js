'use client'

import { corStatus, rotuloStatus } from '@/lib/quadros'
import { DataPrazo, Pastilha, Pessoa } from '@/components/Base'
import { nomeDoMes, partesDaData } from '@/lib/formato'

/**
 * Cronograma por mês de prazo.
 *
 * Renderiza no primeiro passe, sem depender de requestAnimationFrame nem de
 * medição de layout: o agrupamento é cálculo puro sobre os dados recebidos.
 */
export default function Cronograma({ quadro, itens, aoAbrir }) {
  const comPrazo = itens.filter((i) => partesDaData(i.prazo))
  const semPrazo = itens.filter((i) => !partesDaData(i.prazo))

  const mapa = new Map()
  for (const item of comPrazo) {
    const p = partesDaData(item.prazo)
    const chave = `${p.ano}-${String(p.mes).padStart(2, '0')}`
    if (!mapa.has(chave)) mapa.set(chave, { ano: p.ano, mes: p.mes, itens: [] })
    mapa.get(chave).itens.push(item)
  }

  const meses = [...mapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chave, valor]) => ({ chave, ...valor }))

  for (const mes of meses) {
    mes.itens.sort((a, b) => String(a.prazo).localeCompare(String(b.prazo)))
  }

  if (meses.length === 0 && semPrazo.length === 0) {
    return (
      <div className="vazio">
        <h3>Nada no cronograma</h3>
        <p className="sem-margem">
          O cronograma reúne os itens que possuem prazo. Defina prazos na tabela para vê-los aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="cronograma">
      {meses.map((mes) => (
        <section className="mes" key={mes.chave}>
          <div className="mes__titulo">
            <span className="mes__nome">{nomeDoMes(mes.ano, mes.mes)}</span>
            <span className="mes__total">
              {mes.itens.length} item{mes.itens.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="linha-tempo">
            {mes.itens.map((item) => (
              <button
                type="button"
                className="linha-tempo__item"
                key={item.id}
                onClick={() => aoAbrir(item)}
              >
                <DataPrazo valor={item.prazo} />
                <span className="linha-tempo__titulo">{item.titulo}</span>
                <span className="linha-tempo__meta">
                  <Pastilha cor={corStatus(quadro, item.status)}>
                    {rotuloStatus(quadro, item.status)}
                  </Pastilha>
                  <Pessoa nome={item.responsavel} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {semPrazo.length > 0 && (
        <section className="mes">
          <div className="mes__titulo">
            <span className="mes__nome">Sem prazo definido</span>
            <span className="mes__total">
              {semPrazo.length} item{semPrazo.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="linha-tempo">
            {semPrazo.map((item) => (
              <button
                type="button"
                className="linha-tempo__item"
                key={item.id}
                onClick={() => aoAbrir(item)}
              >
                <span className="data data--vazia">—</span>
                <span className="linha-tempo__titulo">{item.titulo}</span>
                <span className="linha-tempo__meta">
                  <Pastilha cor={corStatus(quadro, item.status)}>
                    {rotuloStatus(quadro, item.status)}
                  </Pastilha>
                  <Pessoa nome={item.responsavel} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
