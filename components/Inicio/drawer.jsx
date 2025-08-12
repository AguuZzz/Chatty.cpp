import React, { useEffect, useState } from "react";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { Drawer as PaperDrawer } from "react-native-paper";
import store from "../../utils/storeinfo"; // 👈 manejador de JSON mutable

export default function ChatsDrawer({
  navigation,
  state,
  title = "Chats",
  onSelectChat,
}) {
  const [activeId, setActiveId] = useState(null);
  const [chats, setChats] = useState([]);

  // Cargar chats desde JSON editable
  useEffect(() => {
    (async () => {
      await store.initStore(); // crea si no existe
      const chatsData = await store.readJSON("chatsHistory");
      setChats(Array.isArray(chatsData) ? chatsData : []);
      if (chatsData?.[0]?.id) {
        setActiveId(chatsData[0].id);
      }
    })();
  }, []);

  // Sync con la ruta activa
  useEffect(() => {
    const current = state?.routes?.[state.index];
    const fromRoute = current?.params?.chatId;
    if (fromRoute && fromRoute !== activeId) {
      setActiveId(fromRoute);
    }
  }, [state, activeId]);

  const handlePress = (chat) => {
    setActiveId(chat.id);
    navigation.navigate("Chat", { chatId: chat.id });
    onSelectChat?.(chat.id);
  };

  return (
    <DrawerContentScrollView>
      <PaperDrawer.Section title={title}>
        <PaperDrawer.Item
          icon={"chat-plus"}
          label="New Chat"
          style={style.listItems}
          onPress={() => {
            setActiveId(null);
            navigation.navigate("Home");
          }}
        />
        {chats.map((chat) => (
          <PaperDrawer.Item
            key={chat.id}
            label={chat.name}
            active={activeId === chat.id}
            style={style.listItems}
            onPress={() => handlePress(chat)}
          />
        ))}
      </PaperDrawer.Section>
    </DrawerContentScrollView>
  );
}

const style = {
  listItems: {
    backgroundColor: "#7c7b7bff",
    height: 50,
    marginVertical: 5,
    borderRadius: 30,
  },
};
