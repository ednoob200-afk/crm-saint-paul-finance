export default function Cabecalho({ titulo, descricao, children }) {
  return (
    <header className="topo">
      <div className="topo__titulo">
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {children && <div className="barra-acoes">{children}</div>}
    </header>
  )
}
