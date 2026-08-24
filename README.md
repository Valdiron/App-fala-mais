# Fala+

Aplicativo Android de conversação em idiomas com aulas locais e professor de IA por voz ao vivo.

O catálogo inclui 56 idiomas com busca, exemplos de pronúncia e conversação WebRTC. O backend usa por padrão o modelo gpt-realtime-2.1-mini, respostas curtas e detecção rápida do fim da fala.

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

## Configuração

1. Revogue qualquer chave que tenha sido compartilhada e crie uma nova.
2. Hospede a pasta backend em um serviço Node 20.10 ou superior com HTTPS.
3. Configure OPENAI_API_KEY e FALA_MAIS_APP_TOKEN na hospedagem.
4. Ajuste ALLOWED_ORIGINS para incluir https://appassets.androidplatform.net.
5. No APK, abra Perfil > Professor de IA e informe a URL do backend e o token do aplicativo.

Consulte backend/README.md para os detalhes do servidor.
