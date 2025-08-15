import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Text, Animated } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';

import { Barpild } from '../components/Inicio/barPild';
import store from '../utils/storeinfo';
import { startProcess } from '../utils/inference';

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
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const stopRef = useRef(null);
  const streamingMsgIdRef = useRef(null);
  const listRef = useRef(null);

  // ✅ evita auto-disparos múltiples
  const autoStartedRef = useRef(false);

  const chatsDir = `${FileSystem.documentDirectory}assets/chats`;

  const getNextId = useCallback((arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 1;
    const maxId = arr.reduce((max, it) => Math.max(max, parseInt(it.id || '0', 10) || 0), 0);
    return maxId + 1;
  }, []);

  const persistMessage = useCallback(async (msgText, role = 'user') => {
    await FileSystem.makeDirectoryAsync(chatsDir, { intermediates: true }).catch(() => {});

    if (!chatId) {
      let chatsData = await store.readJSON('chatsHistory').catch(() => []);
      if (!Array.isArray(chatsData)) chatsData = [];

      const newId = getNextId(chatsData);
      const firstName = msgText;

      const newHistory = {
        id: String(newId),
        history: [
          { timestamp: new Date().toISOString(), role: 'user', content: msgText },
        ],
      };

      await FileSystem.writeAsStringAsync(`${chatsDir}/${newId}.json`, JSON.stringify(newHistory, null, 2));
      chatsData.push({ id: String(newId), name: firstName });
      await (store.writeJSON?.('chatsHistory', chatsData) ?? Promise.resolve());

      setChatId(String(newId));
      navigation.replace('Chat', { chatId: String(newId) });
      return String(newId);
    }

    const filePath = `${chatsDir}/${chatId}.json`;
    let chatObj = { id: String(chatId), history: [] };
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(filePath);
        chatObj = JSON.parse(raw || "{}") || { id: String(chatId), history: [] };
        if (!Array.isArray(chatObj.history)) chatObj.history = [];
      }
    } catch {
      chatObj = { id: String(chatId), history: [] };
    }

    chatObj.history.push({ timestamp: new Date().toISOString(), role, content: msgText });
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(chatObj, null, 2));
    return String(chatId);
  }, [chatId, chatsDir, getNextId, navigation]);

  const loadChat = useCallback(async (id) => {
    try {
      let chatsData = await store.readJSON('chatsHistory').catch(() => []);
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
      const json = JSON.parse(raw || "{}");
      const items = Array.isArray(json?.history) ? json.history : [];

      const mapped = items.map((m, idx) => ({
        id: `${idx + 1}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      // invertimos para el FlatList invertido
      setMessages(mapped.reverse());
    } catch (e) {
      console.warn('loadChat error', e);
    }
  }, [chatsDir, navigation]);

  useEffect(() => {
    const nextId = route.params?.chatId ?? null;
    setChatId(nextId);
    if (nextId) loadChat(nextId);
    else setMessages([]);
    // al cambiar de chat, permitimos un nuevo auto-start si aplica
    autoStartedRef.current = false;
  }, [route.params?.chatId, loadChat]);

  const startAssistantStreaming = useCallback(async () => {
    if (!chatId || isGenerating) return;

    // marcamos que ya arrancamos para que el efecto no duplique
    autoStartedRef.current = true;

    const newAssistant = {
      id: `${Date.now()}-asst`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    streamingMsgIdRef.current = newAssistant.id;
    setMessages((prev) => [newAssistant, ...prev]);

    setIsGenerating(true);

    const controller = await startProcess(chatId, {
      onToken: (_token, full) => {
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(m => m.id === streamingMsgIdRef.current);
          if (idx !== -1) updated[idx] = { ...updated[idx], content: full };
          return updated;
        });
      },
      onDone: (text) => {
        setIsGenerating(false);
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(m => m.id === streamingMsgIdRef.current);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], content: text, timestamp: new Date().toISOString() };
          }
          return updated;
        });
      },
      onError: (err) => {
        console.warn("LLM error:", err);
        setIsGenerating(false);
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(m => m.id === streamingMsgIdRef.current);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              content: (updated[idx].content || '') + '\n\n⚠️ Se detuvo la generación.'
            };
          }
          return updated;
        });
      }
    });

    stopRef.current = controller?.stop;

    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);
  }, [chatId, isGenerating]);

  const handleSend = useCallback(async (text) => {
    const trimmed = (text || '').trim();

    if (isGenerating && stopRef.current) {
      stopRef.current?.();
      stopRef.current = null;
      setIsGenerating(false);
      return;
    }

    if (!trimmed) return;

    const newUser = {
      id: `${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [newUser, ...prev]);

    const idStr = await persistMessage(trimmed, 'user');
    const chatIdToUse = chatId ?? idStr;

    if (!chatId && chatIdToUse) {
      setChatId(chatIdToUse);
      // marcamos que se va a autoiniciar por envío del user
      autoStartedRef.current = true;
      setTimeout(() => startAssistantStreaming(), 30);
    } else {
      autoStartedRef.current = true;
      startAssistantStreaming();
    }

    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);
  }, [chatId, isGenerating, persistMessage, startAssistantStreaming]);

  // 🔥 Auto-inicio al abrir el chat si hay un único mensaje del usuario
  useEffect(() => {
    if (!chatId) return;
    if (isGenerating) return;
    if (autoStartedRef.current) return;

    const onlyOne = messages.length === 1;
    const top = messages[0];

    if (onlyOne && top?.role === 'user' && (top?.content ?? '').trim().length > 0) {
      // arrancamos inferencia automáticamente
      autoStartedRef.current = true;
      startAssistantStreaming();
    }
  }, [chatId, messages, isGenerating, startAssistantStreaming]);

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    const isStreamingBubble = !isUser && item.id === streamingMsgIdRef.current;
    const bubbleStyle = isUser ? styles.bubbleUser : styles.bubbleBot;
    const textColor = isUser ? '#111' : '#eee';

    return (
      <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
        {!isUser && <View style={[styles.avatar]}><Text style={styles.avatarText}>🤖</Text></View>}
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
        {isUser && <View style={[styles.avatar]}><Text style={styles.avatarText}>🧑🏻</Text></View>}
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

      <View style={[styles.barpildWrap, { paddingBottom: insets.bottom + 8, paddingHorizontal: 20 }]}>
        <Barpild
          placeholder={isGenerating ? "Generando... toca para detener" : "Escribí algo..."}
          onSend={handleSend}
          isStreaming={isGenerating}
          onStop={() => isGenerating && stopRef.current?.()}
        />
      </View>

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
  avatarText: { fontSize: 14, color: '#fff' },
  barpildWrap: { position: 'absolute', left: 16, right: 16, bottom: 0, backgroundColor: '#232323' },
});
