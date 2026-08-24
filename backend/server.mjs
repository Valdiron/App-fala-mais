import crypto from "node:crypto";
import http from "node:http";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const openAiApiKey = (process.env.OPENAI_API_KEY || "").trim();
const appToken = (process.env.FALA_MAIS_APP_TOKEN || "").trim();
const realtimeModel = (process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1").trim();
const realtimeVoice = (process.env.OPENAI_REALTIME_VOICE || "marin").trim();
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "null,https://appassets.androidplatform.net,http://localhost:4173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (!openAiApiKey || !appToken) {
  console.error("Defina OPENAI_API_KEY e FALA_MAIS_APP_TOKEN antes de iniciar o servidor.");
  process.exit(1);
}

const languageNames = {
  de: "alemão",
  en: "inglês",
  es: "espanhol",
  fr: "francês"
};

const rateLimitWindowMs = 10 * 60 * 1000;
const maxSessionsPerWindow = 20;
const sessionAttempts = new Map();

function timingSafeEqual(expected, actual) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual || "");
  return expectedBuffer.length === actualBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function clientAddress(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return request.socket.remoteAddress || "unknown";
}

function rateLimitExceeded(address) {
  const now = Date.now();
  const current = sessionAttempts.get(address);
  if (!current || now - current.startedAt >= rateLimitWindowMs) {
    sessionAttempts.set(address, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > maxSessionsPerWindow;
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has("*") && !allowedOrigins.has(origin)) {
    return null;
  }
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Fala-Mais-Client, X-Study-Language",
    "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
    "Access-Control-Allow-Origin": origin || "*",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
}

async function readBody(request, maxBytes = 64 * 1024) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBytes) {
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sessionInstructions(languageCode) {
  const language = languageNames[languageCode] || languageNames.en;
  return [
    "Você é o professor de conversação do aplicativo Fala+.",
    "Conduza uma conversa curta, acolhedora e natural no idioma de estudo: " + language + ".",
    "Use frases adequadas para iniciantes, faça uma pergunta por vez e espere o aluno responder.",
    "Corrija erros com gentileza em português, depois repita a forma correta no idioma de estudo.",
    "Mantenha cada resposta falada curta, normalmente entre uma e três frases.",
    "Não peça senhas, chaves de API, dados bancários ou informações pessoais sensíveis."
  ].join(" ");
}

const server = http.createServer(async (request, response) => {
  const cors = corsHeaders(request);
  if (!cors) {
    send(response, 403, { error: "Origem não permitida." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, cors);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url || "/", "http://localhost");
  if (request.method === "GET" && requestUrl.pathname === "/health") {
    send(response, 200, {
      ok: true,
      service: "fala-mais-realtime",
      model: realtimeModel
    }, cors);
    return;
  }

  if (request.method !== "POST" || requestUrl.pathname !== "/session") {
    send(response, 404, { error: "Rota não encontrada." }, cors);
    return;
  }

  const suppliedToken = (request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!timingSafeEqual(appToken, suppliedToken)) {
    send(response, 401, { error: "Token do aplicativo inválido." }, cors);
    return;
  }

  const address = clientAddress(request);
  if (rateLimitExceeded(address)) {
    send(response, 429, { error: "Muitas sessões. Aguarde alguns minutos." }, cors);
    return;
  }

  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/sdp")) {
    send(response, 415, { error: "Envie a oferta WebRTC como application/sdp." }, cors);
    return;
  }

  try {
    const sdp = await readBody(request);
    if (!sdp.trim()) {
      send(response, 400, { error: "Oferta WebRTC vazia." }, cors);
      return;
    }

    const languageCode = String(request.headers["x-study-language"] || "en").toLowerCase();
    const clientId = String(request.headers["x-fala-mais-client"] || address);
    const safetyIdentifier = crypto
      .createHash("sha256")
      .update(clientId)
      .digest("hex");

    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify({
      type: "realtime",
      model: realtimeModel,
      instructions: sessionInstructions(languageCode),
      audio: {
        output: {
          voice: realtimeVoice
        }
      }
    }));

    const openAiResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openAiApiKey,
        "OpenAI-Safety-Identifier": safetyIdentifier
      },
      body: form
    });
    const responseBody = await openAiResponse.text();

    if (!openAiResponse.ok) {
      console.error("Falha ao criar sessão Realtime:", openAiResponse.status, responseBody.slice(0, 500));
      send(response, 502, { error: "Não foi possível iniciar a conversa com a IA." }, cors);
      return;
    }

    response.writeHead(200, {
      ...cors,
      "Content-Type": "application/sdp"
    });
    response.end(responseBody);
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      send(response, 413, { error: "Oferta WebRTC muito grande." }, cors);
      return;
    }
    console.error("Erro interno ao criar sessão:", error instanceof Error ? error.message : error);
    send(response, 500, { error: "Erro interno do servidor." }, cors);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log("Fala+ Realtime disponível na porta " + port + ".");
});
