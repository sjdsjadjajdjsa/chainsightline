export {};
type RpcResult = { result?: unknown; error?: { code?: number; message?: string } };
try { process.loadEnvFile(); } catch {}
const key = process.env.DRPC_KEY?.trim();
if (!key) { console.log(JSON.stringify({ ok: false, step: "config", error: "DRPC_KEY is not set in the private settings file" })); process.exit(1); }
const clean = (text: string) => text.split(key).join("[key]");
let id = 0;
async function rpc(method: string, params: unknown[], useHeader = true): Promise<RpcResult> {
  const url = useHeader ? "https://lb.drpc.org/ogrpc?network=ethereum" : "https://lb.drpc.org/ogrpc?network=ethereum&dkey=" + encodeURIComponent(key!);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useHeader) headers["Drpc-Key"] = key!;
  const started = Date.now();
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }), signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  let body: RpcResult;
  try { body = JSON.parse(text) as RpcResult; } catch { body = { error: { code: response.status, message: clean(text.slice(0, 200)) } }; }
  if (!response.ok && !body.error) body.error = { code: response.status, message: "HTTP " + response.status };
  if (body.error?.message) body.error.message = clean(body.error.message);
  console.error(method + " " + (Date.now() - started) + "ms");
  return body;
}
const report: Record<string, unknown> = {};
let useHeader = true;
let head = await rpc("eth_blockNumber", [], true);
if (head.error) { useHeader = false; report.headerAuth = head.error; head = await rpc("eth_blockNumber", [], false); }
report.auth = useHeader ? "Drpc-Key header" : "dkey parameter";
if (head.error) { console.log(JSON.stringify({ ok: false, step: "eth_blockNumber", ...report, error: head.error })); process.exit(1); }
report.latestBlock = parseInt(String(head.result), 16);
const finalized = await rpc("eth_getBlockByNumber", ["finalized", false], useHeader);
const block = finalized.result as { number?: string; transactions?: string[] } | null;
if (finalized.error || !block?.transactions?.length) { console.log(JSON.stringify({ ok: false, step: "finalized block", ...report, error: finalized.error ?? "no transactions" })); process.exit(1); }
report.finalizedBlock = parseInt(block.number ?? "0", 16);
const hash = block.transactions[0]!;
report.transaction = hash;
const receipt = await rpc("eth_getTransactionReceipt", [hash], useHeader);
const receiptResult = receipt.result as { status?: string; logs?: unknown[] } | null;
report.receipt = receipt.error ? { error: receipt.error } : { status: receiptResult?.status, logs: receiptResult?.logs?.length ?? 0 };
const trace = await rpc("debug_traceTransaction", [hash, { tracer: "callTracer", timeout: "20s" }], useHeader);
type Call = { type?: string; calls?: Call[]; value?: string };
const count = (call: Call): number => 1 + (call.calls ?? []).reduce((total, child) => total + count(child), 0);
const traceResult = trace.result as Call | undefined;
report.debugTrace = trace.error ? { error: trace.error } : { topType: traceResult?.type, calls: traceResult ? count(traceResult) : 0 };
const parity = await rpc("trace_transaction", [hash], useHeader);
report.parityTrace = parity.error ? { error: parity.error } : { entries: Array.isArray(parity.result) ? parity.result.length : 0 };
const ok = !receipt.error && !trace.error;
console.log(JSON.stringify({ ok, ...report }, null, 2));
process.exit(ok ? 0 : 1);
