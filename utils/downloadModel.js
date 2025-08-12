import * as FileSystem from "expo-file-system";

export const HF_URL =
  "https://huggingface.co/QuantFactory/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct.Q4_K_M.gguf?download=true";

export const OUTPUT_FILE = FileSystem.documentDirectory + "model.gguf";
const TEMP_FILE = OUTPUT_FILE + ".part";

export async function checkModelExists(minBytes = 900 * 1024 * 1024) {
  try {
    const info = await FileSystem.getInfoAsync(OUTPUT_FILE);
    return !!(info.exists && (info.size ?? 0) >= minBytes);
  } catch {
    return false;
  }
}

export async function removeModel() {
  const info = await FileSystem.getInfoAsync(OUTPUT_FILE);
  if (info.exists) await FileSystem.deleteAsync(OUTPUT_FILE, { idempotent: true });
}

export async function downloadModel(onProgress) {
  if (await checkModelExists()) return OUTPUT_FILE;

  const tmpInfo = await FileSystem.getInfoAsync(TEMP_FILE);
  if (tmpInfo.exists) await FileSystem.deleteAsync(TEMP_FILE, { idempotent: true });

  const resumable = FileSystem.createDownloadResumable(
    HF_URL,
    TEMP_FILE,
    {},
    (dp) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = dp || {};
      if (typeof onProgress === "function") {
        const denom = totalBytesExpectedToWrite || 1; 
        const ratio = Math.max(0, Math.min(1, totalBytesWritten / denom));
        onProgress(ratio);
      }
    }
  );

  try {
    const res = await resumable.downloadAsync();
    if (!res || !res.uri) throw new Error("Descarga sin URI");

    await FileSystem.moveAsync({ from: TEMP_FILE, to: OUTPUT_FILE });

    const ok = await checkModelExists();
    if (!ok) throw new Error("Archivo final inválido o incompleto");

    return OUTPUT_FILE;
  } catch (err) {
    try { await FileSystem.deleteAsync(TEMP_FILE, { idempotent: true }); } catch {}
    throw err;
  }
}
