import crypto from "node:crypto";
import http from "node:http";

const configuredPort = Number.parseInt(process.env.PORT || "3000", 10);
const port = Number.isFinite(configuredPort) && configuredPort >= 0 && configuredPort <= 65535
  ? configuredPort
  : 3000;
const openAiApiKey = (process.env.OPENAI_API_KEY || "").trim();
const appToken = (process.env.FALA_MAIS_APP_TOKEN || "").trim();
const realtimeModel = (process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini").trim();
const realtimeVoice = (process.env.OPENAI_REALTIME_VOICE || "marin").trim();
const configuredOpenAiTimeoutMs = Number.parseInt(process.env.OPENAI_TIMEOUT_MS || "45000", 10);
const openAiTimeoutMs = Number.isFinite(configuredOpenAiTimeoutMs)
  ? Math.min(120000, Math.max(5000, configuredOpenAiTimeoutMs))
  : 45000;
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "null,https://appassets.androidplatform.net,http://localhost:4173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const missingConfiguration = [
  !openAiApiKey ? "OPENAI_API_KEY" : null,
  !appToken ? "FALA_MAIS_APP_TOKEN" : null
].filter(Boolean);

if (missingConfiguration.length > 0) {
  console.warn(
    "Fala+ iniciou em modo de configuração. Defina: " + missingConfiguration.join(", ") + "."
  );
}

const languageNames = {
  af: "africâner",
  ar: "árabe",
  bg: "búlgaro",
  bn: "bengali",
  ca: "catalão",
  cs: "tcheco",
  da: "dinamarquês",
  de: "alemão",
  el: "grego",
  en: "inglês",
  es: "espanhol",
  et: "estoniano",
  eu: "basco",
  fa: "persa",
  fi: "finlandês",
  fr: "francês",
  ga: "irlandês",
  gl: "galego",
  gu: "gujarati",
  he: "hebraico",
  hi: "hindi",
  hr: "croata",
  hu: "húngaro",
  id: "indonésio",
  is: "islandês",
  it: "italiano",
  ja: "japonês",
  kn: "kannada",
  ko: "coreano",
  lt: "lituano",
  lv: "letão",
  ml: "malaiala",
  mr: "marathi",
  ms: "malaio",
  ne: "nepalês",
  nl: "holandês",
  no: "norueguês",
  pa: "punjabi",
  pl: "polonês",
  pt: "português brasileiro",
  ro: "romeno",
  ru: "russo",
  sk: "eslovaco",
  sl: "esloveno",
  sr: "sérvio",
  sv: "sueco",
  sw: "suaíli",
  ta: "tamil",
  te: "telugu",
  th: "tailandês",
  tl: "tagalo",
  tr: "turco",
  uk: "ucraniano",
  ur: "urdu",
  vi: "vietnamita",
  zh: "chinês mandarim"
};

const rateLimitWindowMs = 10 * 60 * 1000;
const maxSessionsPerWindow = 20;
const sessionAttempts = new Map();

const rateLimitCleanup = setInterval(() => {
  const cutoff = Date.now() - rateLimitWindowMs;
  for (const [address, entry] of sessionAttempts) {
    if (entry.startedAt < cutoff) sessionAttempts.delete(address);
  }
}, rateLimitWindowMs);
rateLimitCleanup.unref();

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

function isAuthorized(request) {
  if (!appToken) return false;
  const suppliedToken = (request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return timingSafeEqual(appToken, suppliedToken);
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
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
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
    "# Função",
    "Você é o professor de conversação do aplicativo Fala+.",
    "# Idioma",
    "Converse sempre no idioma de estudo: " + language + ". Não troque de idioma sem necessidade.",
    "Use português somente para uma correção curta quando isso ajudar o iniciante e repita imediatamente a forma correta no idioma de estudo.",
    "# Resposta rápida",
    "Responda sempre a cada turno concluído do aluno, principalmente quando ele fizer uma pergunta.",
    "Nunca deixe uma pergunta sem resposta. Se não entender o áudio, peça para repetir imediatamente.",
    "Responda imediatamente, sem preâmbulos, cumprimentos repetidos ou explicações longas.",
    "Use uma ou duas frases curtas por turno, faça apenas uma pergunta e aguarde o aluno.",
    "Fale com ritmo claro e ágil, sem parecer apressado.",
    "Se o áudio estiver confuso, peça para repetir em uma frase curta.",
    "# Segurança",
    "Não peça senhas, chaves de API, dados bancários ou informações pessoais sensíveis."
  ].join("\n");
}

function openAiFailureCode(status) {
  if (status === 401) return "OPENAI_AUTH_ERROR";
  if (status === 403) return "OPENAI_PERMISSION_ERROR";
  if (status === 404) return "OPENAI_MODEL_ERROR";
  if (status === 429) return "OPENAI_RATE_LIMIT";
  if (status >= 500) return "OPENAI_UNAVAILABLE";
  return "OPENAI_SESSION_ERROR";
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
  if (request.method === "GET" && requestUrl.pathname === "/") {
    send(response, 200, {
      ok: true,
      ready: missingConfiguration.length === 0,
      service: "fala-mais-realtime",
      message: "Backend do Fala+ disponível.",
      health: "/health"
    }, cors);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    send(response, 200, {
      ok: true,
      ready: missingConfiguration.length === 0,
      service: "fala-mais-realtime",
      version: "1.1.1",
      model: realtimeModel,
      languages: Object.keys(languageNames).length,
      latencyMode: "fast"
    }, cors);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/ready") {
    if (!isAuthorized(request)) {
      send(response, 401, { error: "Token do aplicativo inválido.", code: "APP_TOKEN_INVALID" }, cors);
      return;
    }
    if (missingConfiguration.length > 0) {
      send(response, 503, {
        error: "O backend ainda precisa das variáveis secretas do Render.",
        code: "SERVICE_NOT_CONFIGURED"
      }, cors);
      return;
    }
    send(response, 200, {
      ok: true,
      service: "fala-mais-realtime",
      model: realtimeModel,
      voice: realtimeVoice,
      languages: Object.keys(languageNames).length
    }, cors);
    return;
  }

  if (request.method !== "POST" || requestUrl.pathname !== "/session") {
    send(response, 404, { error: "Rota não encontrada." }, cors);
    return;
  }

  if (!isAuthorized(request)) {
    send(response, 401, { error: "Token do aplicativo inválido.", code: "APP_TOKEN_INVALID" }, cors);
    return;
  }

  if (missingConfiguration.length > 0) {
    send(response, 503, {
      error: "O backend ainda precisa das variáveis secretas do Render.",
      code: "SERVICE_NOT_CONFIGURED"
    }, cors);
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
  const contentLength = Number.parseInt(request.headers["content-length"] || "0", 10);
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    send(response, 413, { error: "Oferta WebRTC muito grande." }, cors);
    return;
  }

  try {
    const sdp = await readBody(request);
    if (!sdp.trim()) {
      send(response, 400, { error: "Oferta WebRTC vazia." }, cors);
      return;
    }

    const requestedLanguage = String(request.headers["x-study-language"] || "en").toLowerCase();
    const languageCode = Object.hasOwn(languageNames, requestedLanguage) ? requestedLanguage : "en";
    const clientId = String(request.headers["x-fala-mais-client"] || address).slice(0, 256);
    const safetyIdentifier = crypto
      .createHash("sha256")
      .update(clientId)
      .digest("hex");

    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify({
      type: "realtime",
      model: realtimeModel,
      reasoning: {
        effort: "low"
      },
      instructions: sessionInstructions(languageCode),
      audio: {
        input: {
          noise_reduction: {
            type: "near_field"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.4,
            prefix_padding_ms: 300,
            silence_duration_ms: 400,
            create_response: true,
            interrupt_response: true
          }
        },
        output: {
          voice: realtimeVoice
        }
      }
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), openAiTimeoutMs);
    let openAiResponse;
    try {
      openAiResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + openAiApiKey,
          "OpenAI-Safety-Identifier": safetyIdentifier
        },
        body: form,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    const responseBody = await openAiResponse.text();

    if (!openAiResponse.ok) {
      console.error("Falha ao criar sessão Realtime:", openAiResponse.status, responseBody.slice(0, 500));
      send(response, 502, {
        error: "Não foi possível iniciar a conversa com a IA.",
        code: openAiFailureCode(openAiResponse.status)
      }, cors);
      return;
    }
    if (!responseBody.trim().startsWith("v=0")) {
      console.error("A OpenAI devolveu uma resposta SDP inválida.");
      send(response, 502, {
        error: "A resposta da sessão de voz foi inválida.",
        code: "OPENAI_INVALID_SDP"
      }, cors);
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
    if (error && error.name === "AbortError") {
      send(response, 504, {
        error: "A OpenAI demorou demais para iniciar a conversa.",
        code: "OPENAI_TIMEOUT"
      }, cors);
      return;
    }
    console.error("Erro interno ao criar sessão:", error instanceof Error ? error.message : error);
    send(response, 500, { error: "Erro interno do servidor." }, cors);
  }
});

server.listen(port, "0.0.0.0", () => {
  const address = server.address();
  const activePort = address && typeof address === "object" ? address.port : port;
  console.log("Fala+ Realtime disponível na porta " + activePort + ".");
});

function shutdown(signal) {
  console.log("Encerrando Fala+ Realtime após " + signal + ".");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
