import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { openAiFailureCode } from "./openai-errors.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const appToken = "fala-mais-smoke-test-token";
const allowedOrigin = "https://appassets.androidplatform.net";

assert.equal(openAiFailureCode(429, "billing_not_active"), "OPENAI_CREDIT_EXHAUSTED");
assert.equal(openAiFailureCode(429, "credit_balance_exhausted"), "OPENAI_CREDIT_EXHAUSTED");
assert.equal(openAiFailureCode(429, "insufficient_quota"), "OPENAI_CREDIT_EXHAUSTED");
assert.equal(openAiFailureCode(429, "rate_limit_exceeded"), "OPENAI_RATE_LIMIT");
assert.equal(openAiFailureCode(401, "invalid_api_key"), "OPENAI_AUTH_ERROR");

async function availablePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function waitForHealth(url, child) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("O backend encerrou antes do teste de saúde.");
    try {
      const response = await fetch(url + "/health");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("O backend não ficou disponível a tempo.");
}

async function stopBackend(child) {
  if (child.exitCode === null) child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]);
}

const unconfiguredPort = await availablePort();
const unconfiguredUrl = "http://127.0.0.1:" + unconfiguredPort;
const unconfiguredChild = spawn(process.execPath, ["server.mjs"], {
  cwd: directory,
  env: {
    ...process.env,
    PORT: String(unconfiguredPort),
    OPENAI_API_KEY: "",
    FALA_MAIS_APP_TOKEN: "",
    ALLOWED_ORIGINS: "null," + allowedOrigin
  },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  await waitForHealth(unconfiguredUrl, unconfiguredChild);
  const unconfiguredHealth = await fetch(unconfiguredUrl + "/health");
  assert.equal(unconfiguredHealth.status, 200);
  const unconfiguredBody = await unconfiguredHealth.json();
  assert.equal(unconfiguredBody.ok, true);
  assert.equal(unconfiguredBody.ready, false);
  assert.equal(unconfiguredBody.version, "1.3.0");
  assert.equal(unconfiguredBody.model, "gpt-realtime-2.1-mini");
  assert.equal(unconfiguredBody.chatModel, "gpt-5.6-luna");

  const unconfiguredReady = await fetch(unconfiguredUrl + "/ready", { method: "POST" });
  assert.equal(unconfiguredReady.status, 401);
} finally {
  await stopBackend(unconfiguredChild);
}

const invalidKeyPort = await availablePort();
const invalidKeyUrl = "http://127.0.0.1:" + invalidKeyPort;
const invalidKeyChild = spawn(process.execPath, ["server.mjs"], {
  cwd: directory,
  env: {
    ...process.env,
    PORT: String(invalidKeyPort),
    OPENAI_API_KEY: "45000",
    FALA_MAIS_APP_TOKEN: appToken,
    ALLOWED_ORIGINS: "null," + allowedOrigin
  },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  await waitForHealth(invalidKeyUrl, invalidKeyChild);
  const invalidHealth = await fetch(invalidKeyUrl + "/health");
  assert.equal(invalidHealth.status, 200);
  assert.equal((await invalidHealth.json()).ready, false);

  const invalidReady = await fetch(invalidKeyUrl + "/ready", {
    method: "POST",
    headers: { Authorization: "Bearer " + appToken }
  });
  assert.equal(invalidReady.status, 503);
  assert.equal((await invalidReady.json()).code, "OPENAI_KEY_INVALID");
} finally {
  await stopBackend(invalidKeyChild);
}

const port = await availablePort();
const baseUrl = "http://127.0.0.1:" + port;
const child = spawn(process.execPath, ["server.mjs"], {
  cwd: directory,
  env: {
    ...process.env,
    PORT: String(port),
    OPENAI_API_KEY: ["sk", "smoke", "test", "not", "used", "outside", "localhost"].join("-"),
    FALA_MAIS_APP_TOKEN: appToken,
    ALLOWED_ORIGINS: "null," + allowedOrigin
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

try {
  await waitForHealth(baseUrl, child);

  const health = await fetch(baseUrl + "/health", { headers: { Origin: allowedOrigin } });
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("access-control-allow-origin"), allowedOrigin);
  assert.equal((await health.json()).ok, true);

  const unauthorized = await fetch(baseUrl + "/ready", { method: "POST" });
  assert.equal(unauthorized.status, 401);

  const ready = await fetch(baseUrl + "/ready", {
    method: "POST",
    headers: { Authorization: "Bearer " + appToken }
  });
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).ok, true);

  const readyWithAppToken = await fetch(baseUrl + "/ready", {
    method: "POST",
    headers: { "X-App-Token": appToken }
  });
  assert.equal(readyWithAppToken.status, 200);
  assert.equal((await readyWithAppToken.json()).ok, true);

  const unauthorizedChat = await fetch(baseUrl + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Olá" }] })
  });
  assert.equal(unauthorizedChat.status, 401);

  const invalidChatJson = await fetch(baseUrl + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-Token": appToken },
    body: "{"
  });
  assert.equal(invalidChatJson.status, 400);

  const wrongChatContentType = await fetch(baseUrl + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "text/plain", "X-App-Token": appToken },
    body: "Olá"
  });
  assert.equal(wrongChatContentType.status, 415);

  const wrongContentType = await fetch(baseUrl + "/session", {
    method: "POST",
    headers: { Authorization: "Bearer " + appToken, "Content-Type": "text/plain" },
    body: "v=0"
  });
  assert.equal(wrongContentType.status, 415);

  const preflight = await fetch(baseUrl + "/api/chat", {
    method: "OPTIONS",
    headers: {
      Origin: allowedOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,x-app-token"
    }
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get("access-control-allow-headers") || "", /X-App-Token/i);

  const forbiddenOrigin = await fetch(baseUrl + "/health", {
    headers: { Origin: "https://example.invalid" }
  });
  assert.equal(forbiddenOrigin.status, 403);

  console.log("Backend smoke test passed.");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await stopBackend(child);
}
