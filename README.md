# Desafio Impact Lab | CoPatrulha

Time composto por:

João Domingos [Linkedin](https://www.linkedin.com/in/joaoldomingos/)

Estéfany Rocha [Linkedin](https://www.linkedin.com/in/estefanyrocha/)

Leandro Aveiro [Linkedin](https://www.linkedin.com/in/leandro-aveiro/)

Leonardo Maciel [Linkedin](https://www.linkedin.com/in/vinicius-ribeiro-ms)

Vinicius Machado [Linkedin](https://www.linkedin.com/in/leonardo-s-antunes-maciel-a4358ba0/)

Instruções para executar o projeto

```bash
npm install
```

```bash
npm run dev
```

## Envio do formulário de contacto (`/contato`)

Crie um `.env` ou `.env.local` na raíz com variáveis **só para o servidor** (sem `NEXT_PUBLIC_`):

| Variável             | Descrição                                                                 |
| -------------------- | ------------------------------------------------------------------------- |
| `BREVO_API_KEY`      | Chave SMTP / API transaccional do Brevo.                                  |
| `BREVO_SENDER_EMAIL` | Remetente **verificado** na conta Brevo (uso no campo `sender` da API).    |

Um modelo está em `.env.example`. O destino das mensagens está em `src/config/contact.ts`.
