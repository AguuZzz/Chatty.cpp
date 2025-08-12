// screens/ChatScreen.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Text, Animated } from 'react-native';import { IconButton, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';

import { Barpild } from '../components/Inicio/barPild'; // si querés, podés reemplazar por el input inline de abajo
import store from '../utils/storeinfo';
import { startStreamingCompletion } from '../utils/inference';

// 3 bolitas animadas
const TypingDots = ({ size = 8, color = '#ddd', spacing = 6 }) => {
  const dots = [0, 1, 2].map(() => new Animated.Value(0.3));

  React.useEffect(() => {
    const anims = dots.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop && a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {dots.map((op, i) => {
        const scale = op.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] });
        return (
          <Animated.View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              marginHorizontal: spacing / 2,
              opacity: op,
              transform: [{ scale }],
            }}
          />
        );
      })}
    </View>
  );
};



export default function ChatScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();

  const [chatId, setChatId] = useState(route.params?.chatId ?? null);
  const [messages, setMessages] = useState([]); // en memoria (inverted para FlatList)
  const [isGenerating, setIsGenerating] = useState(false);
  const stopRef = useRef(null);              // guarda el .stop() de la inferencia actual
  const streamingMsgIdRef = useRef(null);    // id del globo del assistant que se está llenando
  const inputRef = useRef(null);
  const [inlineText, setInlineText] = useState(""); // por si querés usar el input inline

  const listRef = useRef(null);
  const chatsDir = `${FileSystem.documentDirectory}assets/chats`;

  const getNextId = useCallback((arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 1;
    const maxId = arr.reduce((max, it) => Math.max(max, parseInt(it.id || '0', 10) || 0), 0);
    return maxId + 1;
  }, []);

  const loadChat = useCallback(async (id) => {
    try {
      let chatsData = await store.readJSON('chatsHistory');
      if (!Array.isArray(chatsData)) chatsData = [];

      const stillExists = chatsData.some(c => String(c.id) === String(id));
      if (!stillExists) {
        setMessages([]);
        navigation.replace('Home');
        return;
      }

      const filePath = `${chatsDir}/${id}.json`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) {
        setMessages([]);
        navigation.replace('Home');
        return;
      }

      const raw = await FileSystem.readAsStringAsync(filePath);
      const json = JSON.parse(raw);
      const items = Array.isArray(json?.history) ? json.history : [];

      const mapped = items.map((m, idx) => ({
        id: `${idx + 1}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      setMessages(mapped.reverse()); // inverted para FlatList
    } catch (e) {
      console.warn('loadChat error', e);
    }
  }, [chatsDir, navigation]);

  useEffect(() => {
    const nextId = route.params?.chatId ?? null;
    setChatId(nextId);
    if (nextId) loadChat(nextId);
    else setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.chatId]);

  // Persistencia: agrega un mensaje (user|assistant) al archivo del chat
  const persistMessage = useCallback(async (msgText, role = 'user') => {
    await FileSystem.makeDirectoryAsync(chatsDir, { intermediates: true });

    if (!chatId) {
      // crear nuevo chat con el primer mensaje como nombre tentativo
      let chatsData = await store.readJSON('chatsHistory');
      if (!Array.isArray(chatsData)) chatsData = [];

      const newId = getNextId(chatsData);
      const firstName = msgText;

      const newHistory = {
        history: [
          { timestamp: new Date().toISOString(), role: 'user', content: msgText },
        ],
      };

      await FileSystem.writeAsStringAsync(`${chatsDir}/${newId}.json`, JSON.stringify(newHistory, null, 2));
      chatsData.push({ id: String(newId), name: firstName });
      await store.writeJSON('chatsHistory', chatsData);

      setChatId(String(newId));
      navigation.replace('Chat', { chatId: String(newId) });
      return String(newId);
    }

    const filePath = `${chatsDir}/${chatId}.json`;
    let history = { history: [] };
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(filePath);
        history = JSON.parse(raw) || { history: [] };
        if (!Array.isArray(history.history)) history.history = [];
      }
    } catch {
      history = { history: [] };
    }

    history.history.push({ timestamp: new Date().toISOString(), role, content: msgText });
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(history, null, 2));
    return String(chatId);
  }, [chatId, chatsDir, getNextId, navigation]);

  // Lee el historial (orden cronológico) y lo prepara para el LLM
  const buildMessagesForModel = useCallback(async (idStr) => {
    const filePath = `${chatsDir}/${idStr}.json`;
    const raw = await FileSystem.readAsStringAsync(filePath);
    const json = JSON.parse(raw || "{}");
    const items = Array.isArray(json?.history) ? json.history : [];
    // Si querés, podés anteponer un system prompt acá
    const msgs = items.map(({ role, content }) => ({ role, content }));
    return msgs;
  }, [chatsDir]);

  // Inicia streaming del assistant y actualiza el último globo
  const startAssistantStreaming = useCallback(async () => {
    if (!chatId || isGenerating) return;

    // 1) crear el globo vacío del assistant en UI
    const newAssistant = {
      id: `${Date.now()}-asst`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    streamingMsgIdRef.current = newAssistant.id;
    setMessages((prev) => [newAssistant, ...prev]);

    // 2) preparar mensajes para el modelo (con historial real)
    const msgsForLLM = await buildMessagesForModel(String(chatId));

    // 3) lanzar inferencia con streaming
    setIsGenerating(true);
    const handle = startStreamingCompletion({
      messages: msgsForLLM,
      n_predict: 256,
      onToken: (_token, full) => {
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(m => m.id === streamingMsgIdRef.current);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], content: full };
          }
          return updated;
        });
      },
      onDone: async ({ text }) => {
        stopRef.current = null;
        setIsGenerating(false);
        // persistir el mensaje final
        await persistMessage(text, 'assistant');
        // asegurar que el timestamp esté correcto en UI
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(m => m.id === streamingMsgIdRef.current);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], content: text, timestamp: new Date().toISOString() };
          }
          return updated;
        });
      },
      onError: (e) => {
        console.warn('LLM error:', e?.message ?? e);
        stopRef.current = null;
        setIsGenerating(false);
        // mostrar error en el globo
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(m => m.id === streamingMsgIdRef.current);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], content: (updated[idx].content || '') + '\n\n⚠️ Se detuvo la generación.' };
          }
          return updated;
        });
      },
    });

    stopRef.current = handle?.stop ?? null;
  }, [buildMessagesForModel, chatId, isGenerating, persistMessage]);

  // Enviar o Detener según estado
  const handleSend = useCallback(async (text) => {
    const trimmed = (text || '').trim();

    // Si está generando, tocar "enviar" detiene
    if (isGenerating && stopRef.current) {
      stopRef.current();
      stopRef.current = null;
      setIsGenerating(false);
      return;
    }

    if (!trimmed) return;

    // UI inmediata del user
    const newUser = {
      id: `${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [newUser, ...prev]);

    // Persistir USER (y crear chat si no existe)
    const idStr = await persistMessage(trimmed, 'user');
    if (!chatId && idStr) {
      // pequeño delay para que el replace actualice route antes de leer historial
      setTimeout(() => startAssistantStreaming(), 30);
    } else {
      startAssistantStreaming();
    }

    // scrollear al tope
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);
  }, [chatId, isGenerating, persistMessage, startAssistantStreaming]);

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    const isStreamingBubble = !isUser && item.id === streamingMsgIdRef.current;
    const bubbleStyle = isUser ? styles.bubbleUser : styles.bubbleBot;
    const textColor = isUser ? '#111' : '#eee';

    return (
      <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
        {!isUser && <View style={[styles.avatar, styles.avatarLeft]}><Text style={styles.avatarText}>🤖</Text></View>}
        <View style={[styles.bubble, bubbleStyle]}>
         {isStreamingBubble && (!item.content || item.content.trim() === '') ? (
           <View style={{ paddingVertical: 2 }}>
             <TypingDots size={7} color="#cfcfcf" />
           </View>
         ) : (
           <Text style={[styles.msgText, { color: textColor }]}>{item.content}</Text>
         )}
          <Text style={[styles.timeText, { color: textColor }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isUser && <View style={[styles.avatar, styles.avatarRight]}><Text style={styles.avatarText}>🧑🏻</Text></View>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <IconButton
        icon="menu"
        size={24}
        iconColor="#fff"
        containerColor="rgba(255,255,255,0.08)"
        style={{ position: 'absolute', left: 10, top: insets.top + 8, zIndex: 100, borderRadius: 999 }}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <IconButton
        icon="cog"
        size={24}
        iconColor="#fff"
        containerColor="rgba(255,255,255,0.08)"
        style={{ position: 'absolute', right: 10, top: insets.top + 8, zIndex: 100, borderRadius: 999 }}
        onPress={() => navigation.navigate('Ajustes LLM')}
      />

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 78, paddingHorizontal: 12 }}
        data={messages}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        inverted
        removeClippedSubviews
      />

      {/* Input: elegí UNO de los dos. 
          1) Usar tu Barpild (recomendado). Le paso banderas para que cambie a "stop" si lo soporta. */}
      <View style={[styles.barpildWrap, { paddingBottom: insets.bottom + 8, paddingHorizontal: 20 }]}>
        <Barpild
          placeholder={isGenerating ? "Generando... toca para detener" : "Escribí algo..."}
          onSend={handleSend}
          isStreaming={isGenerating}  // si Barpild lo usa, cambia ícono
          onStop={() => isGenerating && stopRef.current?.()} // por si lo implementaste
        />
      </View>

      {/* 2) Alternativa inline simple (descomentar si querés usarla y comentar Barpild)
      <View style={[styles.inlineInput, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          ref={inputRef}
          value={inlineText}
          onChangeText={setInlineText}
          placeholder={isGenerating ? "Generando... toca stop" : "Escribí algo..."}
          style={{ flex: 1, backgroundColor: '#2d2d2d' }}
          editable={!isGenerating}
          onSubmitEditing={() => { handleSend(inlineText); setInlineText(""); }}
        />
        <IconButton
          icon={isGenerating ? "stop" : "send"}
          size={24}
          onPress={() => {
            if (isGenerating) handleSend(""); // detiene
            else { handleSend(inlineText); setInlineText(""); }
          }}
        />
      </View>
      */}

      {/* Botón de stop de respaldo visible SOLO si está generando (por si tu Barpild no cambia ícono) */}
      {isGenerating && (
        <IconButton
          icon="stop"
          size={26}
          mode="contained"
          containerColor="#b00020"
          iconColor="#fff"
          style={{ position: 'absolute', right: 24, bottom: insets.bottom + 86, zIndex: 120, borderRadius: 999 }}
          onPress={() => handleSend("")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#232323' },
  row: { flexDirection: 'row', marginVertical: 6, alignItems: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
  bubble: { maxWidth: '80%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  bubbleUser: { backgroundColor: '#8EE3F5', borderTopRightRadius: 4 },
  bubbleBot: { backgroundColor: '#3a3a3a', borderTopLeftRadius: 4 },
  msgText: { fontSize: 15 },
  timeText: { marginTop: 4, fontSize: 11, alignSelf: 'flex-end', opacity: 0.6 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2c2c2c', marginHorizontal: 6 },
  avatarLeft: {}, avatarRight: {},
  avatarText: { fontSize: 14, color: '#fff' },
  barpildWrap: { position: 'absolute', left: 16, right: 16, bottom: 0, zIndex: 100, backgroundColor: '#232323' },
  inlineInput: { position: 'absolute', left: 16, right: 16, bottom: 0, zIndex: 100, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12 },
});
