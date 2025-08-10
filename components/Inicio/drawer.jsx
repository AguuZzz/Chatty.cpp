// components/ChatsDrawer.js
import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { Drawer } from 'react-native-paper';
// Ajustá la ruta a tu JSON
import chatsData from '../../constants/chatshistory.json';

export default function ChatsDrawer({ title = 'Chats', initialActiveId, onSelectChat }) {
  const [activeId, setActiveId] = useState(initialActiveId || null);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    // Carga directa del JSON local
    setChats(chatsData);
  }, []);

  const handlePress = (chat) => {
    setActiveId(chat.id);
    if (onSelectChat) {
      onSelectChat(chat.id);
    }
  };

  return (
    <Drawer.Section title={title}>
      <ScrollView>
        {chats.map((chat) => (
          <Drawer.Item
            key={chat.id}
            label={chat.name} // 👈 Solo el nombre
            active={activeId === chat.id}
            onPress={() => handlePress(chat)}
          />
        ))}
      </ScrollView>
    </Drawer.Section>
  );
}
