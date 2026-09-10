import { notFound } from 'next/navigation'
import { exigirSessao } from '@/lib/auth'
import { obterQuadro, SLUGS_QUADROS } from '@/lib/quadros'
import { listarItens } from '@/lib/repositories/itens'
import { garantirGruposPadrao } from '@/lib/repositories/grupos'
import { nomesDisponiveis } from '@/lib/repositories/usuarios'
import Cabecalho from '@/components/Cabecalho'
import { Artigos } from '@/components/Base'
import QuadroCliente from '@/components/quadro/QuadroCliente'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const quadro = obterQuadro(slug)
  return { title: quadro ? quadro.nome : 'Quadro' }
}

export default async function PaginaQuadro({ params }) {
  const { slug } = await params
  if (!SLUGS_QUADROS.includes(slug)) notFound()

  const quadro = obterQuadro(slug)
  const usuario = await exigirSessao()

  let dados = { grupos: [], itens: [] }
  let pessoas = []
  let erro = null

  try {
    const [grupos, itens, nomes] = await Promise.all([
      garantirGruposPadrao(slug),
      listarItens(slug, usuario, {}),
      nomesDisponiveis(),
    ])
    dados = { grupos, itens }
    pessoas = nomes
  } catch (falha) {
    console.error('[quadro] carga inicial:', falha.message)
    erro =
      falha.code === '42P01'
        ? 'O banco ainda não foi migrado. Rode `npm run migrate` com a DATABASE_URL do ambiente.'
        : 'Não foi possível carregar este quadro. Verifique a conexão com o banco de dados.'
  }

  return (
    <>
      <Cabecalho titulo={quadro.nome} descricao={quadro.descricao}>
        <Artigos lista={quadro.artigos} />
      </Cabecalho>

      <main className="pagina">
        {erro ? (
          <div className="aviso aviso--erro">{erro}</div>
        ) : (
          <QuadroCliente
            slug={slug}
            dadosIniciais={dados}
            papel={usuario.papel}
            pessoas={pessoas}
          />
        )}
      </main>
    </>
  )
}
