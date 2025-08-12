import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';

import { Barpild } from '../components/Inicio/barPild';
import store from '../utils/storeinfo';

export default function ChatScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const drawerRef = useRef(null);
  const initialChatId = route.params?.chatId ?? null; 
  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  const chatsDir = `${FileSystem.documentDirectory}assets/chats`;

  const getNextId = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 1;
    const maxId = arr.reduce((max, it) => Math.max(max, parseInt(it.id || '0', 10) || 0), 0);
    return maxId + 1;
  };

  const loadChat = async (id) => {
    try {
      const filePath = `${chatsDir}/${id}.json`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) return;
      const raw = await FileSystem.readAsStringAsync(filePath);
      const json = JSON.parse(raw);
      const items = Array.isArray(json?.history) ? json.history : [];
      const mapped = items.map((m, idx) => ({
        id: `${idx + 1}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
      setMessages(mapped.reverse()); 
    } catch (e) {
      console.warn('loadChat error', e);
    }
  };

  const persistMessage = async (msgText, role = 'user') => {
    await FileSystem.makeDirectoryAsync(chatsDir, { intermediates: true });

    if (!chatId) {
      await store.initStore();
      let chatsData = await store.readJSON('chatsHistory');
      if (!Array.isArray(chatsData)) chatsData = [];
      const newId = getNextId(chatsData);
      const firstName = msgText; 

      const newHistory = {
        history: [
          {
            timestamp: new Date().toISOString(),
            role: 'user',
            content: msgText,
          },
        ],
      };
      await FileSystem.writeAsStringAsync(`${chatsDir}/${newId}.json`, JSON.stringify(newHistory, null, 2));

      chatsData.push({ id: String(newId), name: firstName });
      await store.writeJSON('chatsHistory', chatsData);

      setChatId(String(newId));
      return;
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
    } catch {}

    history.history.push({
      timestamp: new Date().toISOString(),
      role,
      content: msgText,
    });

    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(history, null, 2));
  };

  useEffect(() => {
    if (initialChatId) loadChat(initialChatId);
  }, [initialChatId]);

  const handleSend = async (text) => {
    const msg = (text || '').trim();
    if (!msg) return;

    const newItem = {
      id: `${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [newItem, ...prev]);

    await persistMessage(msg, 'user');

    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);

  };

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
        {!isUser && (
          <View style={[styles.avatar, styles.avatarLeft]}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={styles.msgText}>{item.content}</Text>
          <Text style={styles.timeText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isUser && (
          <View style={[styles.avatar, styles.avatarRight]}>
            <Text style={styles.avatarText}>🧑🏻</Text>
          </View>
        )}
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
        style={{
          position: 'absolute',
          left: 10,
          top: insets.top + 8,
          zIndex: 100,
          borderRadius: 999,
        }}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <IconButton
        icon="cog"
        size={24}
        iconColor="#fff"
        containerColor="rgba(255,255,255,0.08)"
        style={{
          position: 'absolute',
          right: 10,
          top: insets.top + 8,
          zIndex: 100,
          borderRadius: 999,
        }}
        onPress={() => navigation.navigate('Ajustes LLM')} // 👈 abre la screen
      />

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 70, paddingHorizontal: 12 }}
        data={messages}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        inverted 
        removeClippedSubviews
      />

      <View style={[styles.barpildWrap, { paddingBottom: insets.bottom + 8, paddingHorizontal: 20 }]}>
        <Barpild placeholder="Write something..." onSend={handleSend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#232323',
  },
  row: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#8EE3F5',
    borderTopRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#3a3a3a',
    borderTopLeftRadius: 4,
  },
  msgText: {
    color: '#111',
    fontSize: 15,
  },
  timeText: {
    marginTop: 4,
    fontSize: 11,
    alignSelf: 'flex-end',
    opacity: 0.7,
    color: '#111',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2c',
    marginHorizontal: 6,
  },
  avatarLeft: {},
  avatarRight: {},
  avatarText: {
    fontSize: 14,
    color: '#fff',
  },
  barpildWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#232323',
  },
});
