# Backend de voz ao vivo do Fala+

Este servidor cria sessões seguras da OpenAI Realtime API. A chave principal nunca é enviada ao APK. O VAD confirma cada turno de voz e cria automaticamente uma resposta para cada fala concluída.

## Configuração local

1. Instale Node.js 20.10 ou superior.
2. Copie .env.example para .env.
3. Crie uma nova chave da OpenAI e defina OPENAI_API_KEY.
4. Gere um token longo e aleatório para FALA_MAIS_APP_TOKEN.
5. Execute npm run dev.
6. Confirme em http://localhost:3000/health.
7. Execute npm test para validar saúde, CORS, token e tipos de conteúdo.

Para o APK, hospede esta pasta em um serviço Node com HTTPS. Depois, no perfil do Fala+, informe a URL pública e o mesmo FALA_MAIS_APP_TOKEN.

## Deploy no Render

O arquivo `render.yaml` na raiz do repositório configura automaticamente um Web Service gratuito para teste.

1. Abra o repositório no Render como um novo Blueprint.
2. Informe uma chave nova em `OPENAI_API_KEY`.
3. Crie um token longo em `FALA_MAIS_APP_TOKEN` e guarde-o para usar no aplicativo.
4. Inicie o deploy e aguarde o serviço ficar disponível.
5. Confirme que `https://fala-mais-api.onrender.com/health` retorna `"ok": true` e `"ready": true`.
6. No aplicativo, use o botão Testar servidor para validar também o `FALA_MAIS_APP_TOKEN` pela rota protegida `/ready`.

Os segredos usam `sync: false` e nunca são salvos no GitHub. O plano gratuito pode hibernar quando fica sem uso, então a primeira conversa após um período parado pode demorar mais.

## Variáveis

- OPENAI_API_KEY: chave nova da OpenAI, somente no servidor. Não coloque `45000` aqui; esse valor pertence a `OPENAI_TIMEOUT_MS`.
- FALA_MAIS_APP_TOKEN: token separado que autoriza o aplicativo.
- ALLOWED_ORIGINS: origens permitidas, separadas por vírgula. O WebView seguro usa https://appassets.androidplatform.net.
- OPENAI_REALTIME_MODEL: padrão gpt-realtime-2.1, com raciocínio `low` para equilibrar inteligência e baixa latência.
- OPENAI_REALTIME_VOICE: padrão marin.
- OPENAI_TIMEOUT_MS: tempo máximo para a OpenAI iniciar a sessão, padrão 45000 ms.
- PORT: porta HTTP, padrão 3000 localmente; o Render fornece essa variável automaticamente.

O backend recusa chaves com formato inválido pela rota protegida `/ready`, usando o código `OPENAI_KEY_INVALID`, antes de solicitar acesso ao microfone no aplicativo.
