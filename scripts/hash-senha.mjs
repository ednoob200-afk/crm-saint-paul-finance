/**
 * Gera o hash de uma senha para a variável ADMIN_PASSWORD_HASH.
 *
 *   npm run hash-senha
 *
 * A senha é lida do terminal sem eco e nunca é gravada em arquivo, log ou
 * histórico do shell. Nenhuma senha em texto puro é aceita pelo sistema.
 */
import { createInterface } from 'node:readline'
import { gerarHashSenha } from '../lib/senha.mjs'

function perguntarOculto(rotulo) {
  return new Promise((resolvido, rejeitado) => {
    if (!process.stdin.isTTY) {
      rejeitado(
        new Error(
          'Rode este comando em um terminal interativo. ' +
            'Não passe a senha por argumento nem por pipe, para não deixá-la no histórico.',
        ),
      )
      return
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const escrever = rl._writeToOutput?.bind(rl)
    rl._writeToOutput = function (texto) {
      if (texto.includes(rotulo)) escrever?.(texto)
    }
    rl.question(rotulo, (resposta) => {
      rl._writeToOutput = escrever
      rl.output.write('\n')
      rl.close()
      resolvido(resposta)
    })
  })
}

const senha = await perguntarOculto('Senha: ')
const confirmacao = await perguntarOculto('Repita a senha: ')

if (senha !== confirmacao) {
  console.error('As senhas não coincidem.')
  process.exit(1)
}
if (senha.length < 12) {
  console.error('Use pelo menos 12 caracteres.')
  process.exit(1)
}

const hash = await gerarHashSenha(senha)

console.log('\nAdicione ao ambiente, sem aspas:\n')
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`)
console.log('Na Vercel:\n  vercel env add ADMIN_PASSWORD_HASH\n')
