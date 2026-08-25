# Fala+

Aplicativo Android de conversação em idiomas com aulas locais e professor de IA por voz ao vivo.

O catálogo inclui 56 idiomas com busca, exemplos de pronúncia e conversação WebRTC. O backend usa por padrão o modelo gpt-realtime-2.1 com raciocínio `low`, respostas curtas e detecção rápida do fim da fala.

A versão 2.0.0 reformula o aplicativo com uma interface premium escura, esfera animada da Lumi, atalhos inteligentes e uma nova área Arcade. Ela traz cinco mini games jogáveis — Quiz relâmpago, Memória de palavras, Monte a frase, Escuta rápida e Verdadeiro ou falso — com pontuação e recordes salvos no aparelho.

Lumi continua conectando, ouvindo, pensando e respondendo visualmente. Ela responde perguntas de assuntos gerais, explica, traduz e ensina por voz com baixa latência, usa `https://fala-mais-api.onrender.com` como backend padrão e preserva as correções de acesso ao microfone. O usuário informa somente o `FALA_MAIS_APP_TOKEN` no Perfil; a chave da OpenAI permanece no servidor.

## APK Android

O workflow Build Fala+ APK reconstrói o projeto armazenado em builddata, compila o APK de teste e publica o artefato fala-mais-apk.

A partir da versão 1.8.1, o workflow também valida a assinatura APK v2 e preserva uma chave de atualização estável entre as compilações do branch principal.

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

O repositório inclui `render.yaml`, que cria o Web Service Node gratuito `fala-mais-api`, com HTTPS, verificação em `/health`, teste autenticado em `/ready` e deploy automático a cada commit.

Durante a criação do Blueprint, o Render solicitará:

- `OPENAI_API_KEY`: crie uma chave nova e informe somente no Render.
- `FALA_MAIS_APP_TOKEN`: crie um token longo, guarde-o e use o mesmo valor no aplicativo.

Depois do primeiro deploy, confirme que `https://fala-mais-api.onrender.com/health` retorna `"ok": true`. A mesma URL já está configurada como endereço padrão no APK.

## Configuração

1. Revogue qualquer chave que tenha sido compartilhada e crie uma nova.
2. Clique em Deploy to Render e conecte este repositório como Blueprint.
3. Configure OPENAI_API_KEY e FALA_MAIS_APP_TOKEN na hospedagem.
4. Ajuste ALLOWED_ORIGINS para incluir https://appassets.androidplatform.net.
5. No APK, abra Perfil > Professor de IA e informe a URL do backend e o token do aplicativo.

Consulte backend/README.md para os detalhes do servidor.
