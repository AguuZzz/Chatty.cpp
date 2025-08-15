// utils/inference.js
import { initLlama } from "llama.rn";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import store from "./storeinfo"; // debe exponer readJSON y (si querés) writeJSON

const MODEL_PATH = FileSystem.documentDirectory + "model.gguf";
const CHAT_DIR = FileSystem.documentDirectory + "assets/chats";

const DEFAULTS = { n_batch: 256, n_ctx: 2048, threads: 4 };

const STOP_WORDS = [
  "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>",
  "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>",
  "<|end_of_turn|>", "<|endoftext|>"
];

// -------------------- Helpers --------------------
async function ensureChatDir() {
  await FileSystem.makeDirectoryAsync(CHAT_DIR, { intermediates: true }).catch(() => {});
}

async function readChatObject(chatID) {
  try {
    const p = `${CHAT_DIR}/${chatID}.json`;
    const info = await FileSystem.getInfoAsync(p);
    if (!info.exists) return { id: String(chatID), history: [] };
    const raw = await FileSystem.readAsStringAsync(p);
    const json = JSON.parse(raw || "{}");
    if (!Array.isArray(json?.history)) json.history = [];
    return json;
  } catch {
    return { id: String(chatID), history: [] };
  }
}

async function writeChatObject(chatID, obj) {
  await ensureChatDir();
  const p = `${CHAT_DIR}/${chatID}.json`;
  await FileSystem.writeAsStringAsync(p, JSON.stringify(obj ?? {}, null, 2));
}

// -------------------- Paso 1: Contexto --------------------
export async function prepareContext(chatID) {
  // 1) sysprompt desde personaje
  let sysprompt = "Sos un asistente útil y directo.";
  try {
    const charactersData = await store.readJSON("characters");
    const currentCharacterName = await AsyncStorage.getItem("selectedCharacter");
    const found = Array.isArray(charactersData)
      ? charactersData.find(c => c.name?.toLowerCase?.() === currentCharacterName?.toLowerCase?.())
      : null;
    if (found?.sysprompt?.trim()) sysprompt = found.sysprompt.trim();
  } catch {
    // fallback ya definido
  }

  // 2) historial del chat (últimos 10) y chatCTX con system primero
  const chatObj = await readChatObject(chatID);
  const hist = Array.isArray(chatObj.history) ? chatObj.history : [];
  const last10 = hist.length > 10 ? hist.slice(-10) : hist;

  const chatCTX = [
    { role: "system", content: sysprompt },
    ...last10.map(({ role, content }) => ({ role, content }))
  ];

  return { sysprompt, chatCTX };
}

// -------------------- Paso 2: Config --------------------
export async function prepareCFG() {
  try {
    const cfg = await store.readJSON("config");
    const n_ctx = Number.isFinite(cfg?.n_ctx) ? Math.max(128, Math.floor(cfg.n_ctx)) : DEFAULTS.n_ctx;
    const n_batch = Number.isFinite(cfg?.n_batch) ? Math.max(1, Math.floor(cfg.n_batch)) : DEFAULTS.n_batch;
    const threads = Number.isFinite(cfg?.threads) ? Math.max(1, Math.floor(cfg.threads)) : DEFAULTS.threads;
    return { n_batch, n_ctx, threads };
  } catch {
    return DEFAULTS;
  }
}

// -------------------- Paso 3: Inferencia con streaming --------------------
/**
 * onToken(token, fullSoFar)
 * shouldContinue() => boolean (true para seguir, false para cortar)
 */
export async function inference(
  sysprompt,
  chatCTX,
  n_batch,
  n_ctx,
  threads,
  id,
  onToken,
  shouldContinue
) {
  let full = "";

  const ctx = await initLlama({
    model: MODEL_PATH,
    use_mlock: true,
    n_batch,
    n_ctx,
    n_threads: threads,
  });

  await ctx.completion(
    {
      messages: chatCTX,
      n_predict: 100,
      stop: STOP_WORDS,
    },
    (chunk) => {
      const token = chunk?.token ?? chunk?.content ?? chunk?.text ?? "";
      if (token) {
        full += token;
        onToken?.(token, full);
      }
      // Control de cancelación
      if (shouldContinue && !shouldContinue()) return false;
      return true;
    }
  );

  // Guardar respuesta del assistant al finalizar
  await ensureChatDir();
  const chatObj = await readChatObject(id);
  chatObj.history.push({
    timestamp: new Date().toISOString(),
    role: "assistant",
    content: full.trim(),
  });
  await writeChatObject(id, chatObj);

  return full;
}

// -------------------- Paso 4: Orquestador simple para la pantalla --------------------
/**
 * startProcess(chatId, { onToken, onDone, onError })
 * Devuelve { stop: () => void }
 */
export function startProcess(chatId, { onToken, onDone, onError } = {}) {
  let cancelled = false;

  (async () => {
    try {
      const { sysprompt, chatCTX } = await prepareContext(chatId);
      const { n_batch, n_ctx, threads } = await prepareCFG();

      const full = await inference(
        sysprompt,
        chatCTX,
        n_batch,
        n_ctx,
        threads,
        chatId,
        onToken,
        () => !cancelled
      );

      onDone?.(full);
    } catch (e) {
      onError?.(e);
    }
  })();

  return {
    stop: () => { cancelled = true; }
  };
}
