// Minimal, stateless MCP server over Streamable HTTP (JSON responses).
// Implements initialize, ping, tools/list and tools/call. No sessions and no
// server-sent events, which is all a read-only radar needs.

import { Budget } from "./lib/http.js";
import { toolsFor } from "./tools/index.js";

export const SERVER_INFO = { name: "pai-radar", title: "P.a.i Radar", version: "1.0.0" };
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = `P.a.i Radar reads free AI news sources: lab blogs and news pages, the foreign desk (DE/DA/ES/ZH), Brazilian outlets, GitHub, arXiv, Hugging Face, Hacker News, Bluesky, and an Instagram/YouTube watchlist of Brazilian AI accounts.
Typical flow: lab_news + github_releases + hf_trending to find what is new → brazil_gap(keywords) to see whether Brazil already covered it.
Every tool returns an "errors" or "not_checked" list. Report those honestly; never treat an unchecked source as "not covered". Foreign items keep their original language and URL.`;

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleOne(msg, env, deps) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(msg?.id, -32600, "Invalid Request");
  const isNotification = msg.id === undefined || msg.id === null;
  const { method, params = {} } = msg;

  if (method.startsWith("notifications/")) return null;

  switch (method) {
    case "initialize": {
      const v = SUPPORTED.includes(params.protocolVersion) ? params.protocolVersion : SUPPORTED[0];
      return { jsonrpc: "2.0", id: msg.id, result: { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS } };
    }
    case "ping":
      return isNotification ? null : { jsonrpc: "2.0", id: msg.id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: { tools: toolsFor(env).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: { readOnlyHint: t.name !== "watchlist", openWorldHint: true } })) },
      };
    case "tools/call": {
      const tool = toolsFor(env).find((t) => t.name === params.name);
      if (!tool) return rpcError(msg.id, -32602, `Unknown tool: ${params.name}`);
      const ctx = { env, budget: new Budget(Number(env.SUBREQUEST_LIMIT) || 45), fetch: deps.fetch };
      try {
        const out = await tool.run(params.arguments || {}, ctx);
        if (ctx.budget.skipped.length && out && typeof out === "object" && !out.budget_note) {
          out.budget_note = `Skipped ${ctx.budget.skipped.length} request(s) to stay inside the per-call limit: ${ctx.budget.skipped.slice(0, 10).join(", ")}. Narrow the call (fewer groups or handles) to read them.`;
        }
        return { jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out, isError: Boolean(out?.error) } };
      } catch (e) {
        return { jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: `Tool failed: ${e?.message || e}` }], isError: true } };
      }
    }
    default:
      return isNotification ? null : rpcError(msg.id, -32601, `Method not found: ${method}`);
  }
}

export async function handleMcp(request, env, deps = {}) {
  if (request.method === "GET" || request.method === "DELETE") {
    return new Response("This server does not open event streams. Use POST.", { status: 405, headers: { allow: "POST" } });
  }
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }
  const batch = Array.isArray(body);
  const msgs = batch ? body : [body];
  const replies = (await Promise.all(msgs.map((m) => handleOne(m, env, deps)))).filter(Boolean);
  if (replies.length === 0) return new Response(null, { status: 202 });
  return Response.json(batch ? replies : replies[0], { headers: { "mcp-protocol-version": SUPPORTED[0] } });
}
