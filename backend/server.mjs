import crypto from "node:crypto";
import http from "node:http";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const openAiApiKey = (process.env.OPENAI_API_KEY || "").trim();
const appToken = (process.env.FALA_MAIS_APP_TOKEN || "").trim();
const realtimeModel = (process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini").trim();
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
      service: "fala-mais-realtime",
      message: "Backend do Fala+ disponível.",
      health: "/health"
    }, cors);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    send(response, 200, {
      ok: true,
      service: "fala-mais-realtime",
      model: realtimeModel,
      languages: Object.keys(languageNames).length,
      latencyMode: "fast"
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
            create_response: false,
            interrupt_response: true
          }
        },
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
