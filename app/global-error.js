'use client'

/**
 * Último anteparo de erro. Nunca exibe stack trace: o detalhe técnico fica no
 * log do servidor, e a pessoa recebe uma mensagem legível e uma saída.
 */
export default function ErroGlobal({ reset }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#031F1A',
          color: '#F3F1EA',
          fontFamily: 'system-ui, sans-serif',
          padding: '22px',
        }}
      >
        <div style={{ maxWidth: '440px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem' }}>
            Erro inesperado
          </h1>
          <p style={{ lineHeight: 1.6 }}>
            Algo falhou ao carregar esta página. A ocorrência foi registrada no servidor. Tente
            novamente; se persistir, verifique a rota <code>/api/saude</code>.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #43A178',
              background: '#43A178',
              color: '#031F1A',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
