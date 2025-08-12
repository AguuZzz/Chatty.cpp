import { initLlama } from "llama.rn";
import * as FileSystem from "expo-file-system";

const MODEL_PATH = FileSystem.documentDirectory + "model.gguf";
export const CONFIG_PATH = FileSystem.documentDirectory + "config.json";

const DEFAULTS = { n_batch: 256, n_ctx: 2048, threads: 4 };

async function readConfig() {
  try {
    const info = await FileSystem.getInfoAsync(CONFIG_PATH);
    if (!info.exists) return DEFAULTS;
    const raw = await FileSystem.readAsStringAsync(CONFIG_PATH);
    const json = JSON.parse(raw || "{}");

    const n_ctx = Number.isFinite(json.n_ctx) ? Math.max(128, Math.floor(json.n_ctx)) : DEFAULTS.n_ctx;
    const n_batch = Number.isFinite(json.n_batch) ? Math.max(1, Math.floor(json.n_batch)) : DEFAULTS.n_batch;
    const threads = Number.isFinite(json.threads) ? Math.max(1, Math.floor(json.threads)) : DEFAULTS.threads;
    return { n_ctx, n_batch, threads };
  } catch (e) {
    console.warn("Config inválida, uso defaults:", e?.message ?? e);
    return DEFAULTS;
  }
}

let ctxPromise = null;
async function getCtx() {
  if (!ctxPromise) {
    const { n_ctx, n_batch, threads } = await readConfig();
    ctxPromise = initLlama({
      model: MODEL_PATH,
      use_mlock: true,
      n_ctx,
      n_batch,
      n_threads: threads,
    }).then((ctx) => ({ ctx, cfg: { n_ctx, n_batch, threads } }));
  }
  return ctxPromise;
}

const STOP_WORDS = [
  "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>",
  "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>",
  "<|end_of_turn|>", "<|endoftext|>"
];

/**
 * Streaming chat completion.
 * - messages: [{role:"system"|"user"|"assistant", content:string}, ...]
 * - onToken(token, fullTextSoFar) se llama por cada token
 * - onDone({ text, timings }) al finalizar
 * - retorna { stop } para cortar la generación
 */
export function startStreamingCompletion({
  messages,
  n_predict = 256,
  onToken,
  onDone,
  onError,
} = {}) {
  let cancelled = false;
  let full = "";

  (async () => {
    try {
      const { ctx, cfg } = await getCtx();

      const params = {
        messages,
        n_predict,
        stop: STOP_WORDS,
        n_batch: cfg.n_batch,
        n_threads: cfg.threads,
      };

      const result = await ctx.completion(params, (chunk) => {
        // llama.rn envía tokens/fragmentos en "chunk.token" o "chunk.content"
        const token = chunk?.token ?? chunk?.content ?? chunk?.text ?? "";
        if (token) {
          full += token;
          onToken?.(token, full);
        }
        // devolvé false para cortar
        return !cancelled;
      });

      onDone?.({
        text: result?.content ?? result?.text ?? full,
        timings: result?.timings,
      });
    } catch (e) {
      if (!cancelled) onError?.(e);
    }
  })();

  return {
    stop: () => {
      cancelled = true;
    },
  };
}
