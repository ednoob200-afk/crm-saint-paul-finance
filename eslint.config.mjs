import next from 'eslint-config-next/core-web-vitals'

const configuracao = [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'data/**'],
  },

  ...next,

  {
    // Regras próprias do projeto.
    rules: {
      'no-unused-vars': [
        'warn',
        { args: 'after-used', ignoreRestSiblings: true, argsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'error',

      // Armadilha do navegador: nomes globais como `top`, `self`, `status`,
      // `name`, `length`, `closed`, `origin`, `parent` e `location` colidem com
      // propriedades de window e produzem bugs silenciosos.
      'no-restricted-globals': [
        'error',
        { name: 'top', message: 'Colide com window.top. Use outro nome.' },
        { name: 'self', message: 'Colide com window.self. Use outro nome.' },
        { name: 'parent', message: 'Colide com window.parent. Use outro nome.' },
        { name: 'status', message: 'Colide com window.status. Use outro nome.' },
        { name: 'name', message: 'Colide com window.name. Use outro nome.' },
        { name: 'length', message: 'Colide com window.length. Use outro nome.' },
        { name: 'closed', message: 'Colide com window.closed. Use outro nome.' },
        { name: 'origin', message: 'Colide com window.origin. Use outro nome.' },
        { name: 'location', message: 'Colide com window.location. Use outro nome.' },
        { name: 'event', message: 'Use o parâmetro do manipulador em vez do global.' },
      ],
    },
  },

  {
    // Scripts de linha de comando rodam em Node, fora do bundle do Next.
    files: ['scripts/**/*.mjs', 'lib/senha.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
]

export default configuracao
