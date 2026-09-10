import {
  exigirPapel,
  ipDaRequisicao,
  registrarAuditoria,
  verificarOrigem,
} from '@/lib/auth'
import { buscarPorEmail, criarUsuario, listarUsuarios } from '@/lib/repositories/usuarios'
import { usuarioSchema } from '@/lib/validacao'
import { erro, erroDeValidacao, lerJson, ok, tratarErro } from '@/lib/respostas'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Gestão de acessos é matéria de Presidência ou do administrador do
    // sistema (Art. 38º, Art. 97º §1º).
    await exigirPapel('presidencia')
    return ok({ usuarios: await listarUsuarios() })
  } catch (e) {
    return tratarErro(e, 'usuarios GET')
  }
}

export async function POST(request) {
  try {
    verificarOrigem(request)
    const usuario = await exigirPapel('presidencia')

    const corpo = await lerJson(request, 20_000)
    const validado = usuarioSchema.safeParse(corpo)
    if (!validado.success) {
      return erroDeValidacao(
        validado.error.issues.map((i) => ({
          campo: i.path.join('.') || 'corpo',
          mensagem: i.message,
        })),
      )
    }

    // Ninguém cria papel acima do próprio: bloqueia escalada de privilégio.
    if (validado.data.papel === 'administrador' && usuario.papel !== 'administrador') {
      return erro(
        'Somente o administrador do sistema pode criar outro administrador do sistema.',
        403,
      )
    }

    const existente = await buscarPorEmail(validado.data.email)
    if (existente) return erro('Já existe um usuário com este e-mail.', 409)

    const criado = await criarUsuario(validado.data)

    await registrarAuditoria({
      usuario: usuario.email,
      papel: usuario.papel,
      acao: 'usuario_criado',
      recurso: `usuarios/${criado.id}`,
      detalhe: `${criado.email} como ${criado.papel}`,
      ip: ipDaRequisicao(request),
    })

    return ok({ usuario: criado }, 201)
  } catch (e) {
    return tratarErro(e, 'usuarios POST')
  }
}
