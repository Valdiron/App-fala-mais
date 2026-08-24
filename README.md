# Fala+

Aplicativo Android de conversação em idiomas com aulas locais e professor de IA por voz ao vivo.

O catálogo inclui 56 idiomas com busca, exemplos de pronúncia e conversação WebRTC. O backend usa por padrão o modelo gpt-realtime-2.1-mini, respostas curtas e detecção rápida do fim da fala.

A versão 1.7.0 do APK traz o novo ícone oficial do Fala+, responde a cada pergunta concluída e usa `https://fala-mais-api.onrender.com` como backend padrão. O usuário ainda informa somente o `FALA_MAIS_APP_TOKEN` no Perfil; a chave da OpenAI permanece no servidor.

## APK Android

O workflow Build Fala+ APK reconstrói o projeto armazenado em builddata, compila o APK de teste e publica o artefato fala-mais-apk.

O arquivo gerado fica em:

android/app/build/outputs/apk/debug/app-debug.apk

## Voz em tempo real

O aplicativo usa WebRTC para conversar com a OpenAI Realtime API. A chave principal nunca é embutida no APK.

Fluxo:

1. O APK envia sua oferta WebRTC ao backend Node.
2. O backend usa OPENAI_API_KEY somente no servidor.
3. A OpenAI devolve a sessão de áudio ao aplicativo.
4. O usuário fala e recebe respostas por voz com baixa latência.

## Hospedar o backend no Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Valdiron/App-fala-mais)

O repositório inclui `render.yaml`, que cria um Web Service Node gratuito para teste, com HTTPS, verificação em `/health` e deploy após os testes do GitHub.

Durante a criação do Blueprint, o Render solicitará:

- `OPENAI_API_KEY`: crie uma chave nova e informe somente no Render.
- `FALA_MAIS_APP_TOKEN`: crie um token longo, guarde-o e use o mesmo valor no aplicativo.

Depois do primeiro deploy, copie a URL `https://...onrender.com`. Ela será adicionada como endereço padrão no APK na próxima etapa.

## Configuração

1. Revogue qualquer chave que tenha sido compartilhada e crie uma nova.
2. Clique em Deploy to Render e conecte este repositório como Blueprint.
3. Configure OPENAI_API_KEY e FALA_MAIS_APP_TOKEN na hospedagem.
4. Ajuste ALLOWED_ORIGINS para incluir https://appassets.androidplatform.net.
5. No APK, abra Perfil > Professor de IA e informe a URL do backend e o token do aplicativo.

Consulte backend/README.md para os detalhes do servidor.
