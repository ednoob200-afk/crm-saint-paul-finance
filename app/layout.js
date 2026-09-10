import { Spectral, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const spectral = Spectral({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--fonte-spectral',
})

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--fonte-plex-sans',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--fonte-plex-mono',
})

export const metadata = {
  title: {
    default: 'Saint Paul Finance — CRM institucional',
    template: '%s · Saint Paul Finance',
  },
  description:
    'CRM institucional e gestor de trabalho da Saint Paul Finance, fundamentado no Estatuto Oficial vigente.',
  robots: { index: false, follow: false },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3F1EA' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1512' },
  ],
}

/**
 * Aplica o tema escolhido antes da primeira pintura, para não haver piscada.
 * Protegido por try/catch: em navegação privada o acesso pode lançar.
 * Nenhum dado institucional depende disto — é apenas preferência visual.
 */
const scriptTema = `
try {
  var t = localStorage.getItem('spf_tema');
  if (t === 'claro' || t === 'escuro') {
    document.documentElement.setAttribute('data-theme', t);
  }
} catch (e) {}
`

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${spectral.variable} ${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
