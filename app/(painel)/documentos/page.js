import { exigirSessao } from '@/lib/auth'
import { listarDocumentos } from '@/lib/repositories/documentos'
import { chaveConfigurada, modeloEmUso } from '@/lib/ia'
import { storageConfigurado, TAMANHO_MAXIMO, TIPOS_ACEITOS } from '@/lib/storage'
import { podeAprovarTriagem } from '@/lib/quadros'
import Cabecalho from '@/components/Cabecalho'
import { Artigos } from '@/components/Base'
import Triagem from '@/components/documentos/Triagem'

export const metadata = { title: 'Documentos e triagem por IA' }
export const dynamic = 'force-dynamic'

export default async function PaginaDocumentos() {
  const usuario = await exigirSessao()

  let documentos = []
  let erro = null
  try {
    documentos = await listarDocumentos(usuario)
  } catch (falha) {
    console.error('[documentos] carga inicial:', falha.message)
    erro =
      falha.code === '42P01'
        ? 'O banco ainda não foi migrado. Rode `npm run migrate` com a DATABASE_URL do ambiente.'
        : 'Não foi possível carregar os documentos. Verifique a conexão com o banco de dados.'
  }

  return (
    <>
      <Cabecalho
        titulo="Documentos e triagem por IA"
        descricao="A IA sugere o roteamento; uma pessoa autorizada revisa, edita e distribui."
      >
        <Artigos lista={['Art. 100º', 'Art. 108º', 'Art. 109º', 'Art. 110º']} />
      </Cabecalho>

      <main className="pagina">
        {erro ? (
          <div className="aviso aviso--erro">{erro}</div>
        ) : (
          <Triagem
            documentosIniciais={documentos}
            papel={usuario.papel}
            podeDistribuir={podeAprovarTriagem(usuario.papel)}
            iaConfigurada={chaveConfigurada()}
            modelo={chaveConfigurada() ? modeloEmUso() : null}
            storageConfigurado={storageConfigurado()}
            tamanhoMaximo={TAMANHO_MAXIMO}
            tiposAceitos={Object.values(TIPOS_ACEITOS)}
          />
        )}
      </main>
    </>
  )
}
