import * as FileSystem from 'expo-file-system';

import charactersInit from '../assets/jsons/characters.json';
import chatsHistoryInit from '../assets/jsons/chatshistory.json';

const paths = {
  characters: FileSystem.documentDirectory + 'characters.json',
  chatsHistory: FileSystem.documentDirectory + 'chatshistory.json',
};

const CHAT_DIR = `${FileSystem.documentDirectory}assets/chats`;

function chatPath(chatId) {
  return `${CHAT_DIR}/${chatId}.json`;
}

async function ensureChatDir() {
  const info = await FileSystem.getInfoAsync(CHAT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CHAT_DIR, { intermediates: true });
  }
}

async function readChatFile(chatId) {
  const path = chatPath(chatId);
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  const raw = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
  try {
    return JSON.parse(raw);
  } catch {
    return { id: String(chatId), history: [] };
  }
}

async function writeChatFile(chatObj) {
  const path = chatPath(chatObj.id);
  await FileSystem.writeAsStringAsync(
    path,
    JSON.stringify(chatObj, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
  return chatObj;
}

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

export async function initStore() {
  await copyJSONIfNotExists(charactersInit, paths.characters);
  await copyJSONIfNotExists(chatsHistoryInit, paths.chatsHistory);
}

export async function readJSON(key) {
  const contenido = await FileSystem.readAsStringAsync(paths[key]);
  return JSON.parse(contenido);
}

export async function writeJSON(key, data) {
  await FileSystem.writeAsStringAsync(
    paths[key],
    JSON.stringify(data, null, 2)
  );
}

export async function addToChat(chatId, content, role) {
  await ensureChatDir();

  let chatObj = await readChatFile(chatId);
  if (!chatObj) {
    chatObj = { id: String(chatId), history: [] };
  }
  if (!Array.isArray(chatObj.history)) chatObj.history = [];

  chatObj.history.push({
    timestamp: new Date().toISOString(),
    role,
    content,
  });

  await writeChatFile(chatObj);
  return chatObj; 
}


export default {
  initStore,
  readJSON,
  writeJSON,
};