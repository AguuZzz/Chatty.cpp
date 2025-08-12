// utils/storeinfo.js
import * as FileSystem from 'expo-file-system';

// 🔹 Datos iniciales (importados estáticamente para que Metro los incluya)
import charactersInit from '../assets/jsons/characters.json';
import chatsHistoryInit from '../assets/jsons/chatshistory.json';

// Rutas internas en documentDirectory (editable)
const paths = {
  characters: FileSystem.documentDirectory + 'characters.json',
  chatsHistory: FileSystem.documentDirectory + 'chatshistory.json',
};

// Crea el JSON si no existe en documentDirectory
async function copyJSONIfNotExists(initialData, targetPath) {
  const fileInfo = await FileSystem.getInfoAsync(targetPath);
  if (!fileInfo.exists) {
    console.log(`📄 Creando ${targetPath}...`);
    await FileSystem.writeAsStringAsync(
      targetPath,
      JSON.stringify(initialData, null, 2)
    );
  } else {
    console.log(`✅ Ya existe: ${targetPath}`);
  }
}

// Inicializa todos los JSON
export async function initStore() {
  await copyJSONIfNotExists(charactersInit, paths.characters);
  await copyJSONIfNotExists(chatsHistoryInit, paths.chatsHistory);
}

// Leer JSON editable
export async function readJSON(key) {
  const contenido = await FileSystem.readAsStringAsync(paths[key]);
  return JSON.parse(contenido);
}

// Escribir JSON editable
export async function writeJSON(key, data) {
  await FileSystem.writeAsStringAsync(
    paths[key],
    JSON.stringify(data, null, 2)
  );
}

export default {
  initStore,
  readJSON,
  writeJSON,
};
