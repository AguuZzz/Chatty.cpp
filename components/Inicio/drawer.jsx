import React, {
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { DrawerContentScrollView , useDrawerStatus } from "@react-navigation/drawer";
import { Drawer as PaperDrawer, IconButton } from "react-native-paper";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import store from "../../utils/storeinfo";

const ChatsDrawer = (
  { navigation, state, title = "Chats", onSelectChat },
  ref
) => {
  const [activeId, setActiveId] = useState(null);
  const [chats, setChats] = useState([]);

  const status = useDrawerStatus();

  const refreshChats = useCallback(async () => {
    await store.initStore();
    const chatsData = await store.readJSON("chatsHistory");
    const arr = Array.isArray(chatsData) ? chatsData : [];
    setChats(arr);
    if (arr?.[0]?.id && !activeId) {
      setActiveId(arr[0].id);
    }
  }, [activeId]);

  useEffect(() => {
  if (status === 'open') {
    refreshChats();
  }
}, [status, refreshChats]);

  useImperativeHandle(ref, () => ({
    refreshChats,
  }));

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

  const deleteChat = useCallback(
    async (idToDelete) => {
      try {
        const path = `${FileSystem.documentDirectory}assets/chats/${idToDelete}.json`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });

        await store.initStore();
        let chatsData = await store.readJSON("chatsHistory");
        if (!Array.isArray(chatsData)) chatsData = [];
        const filtered = chatsData.filter(c => String(c.id) !== String(idToDelete));
        await store.writeJSON("chatsHistory", filtered);

        setChats(filtered);

        if (String(activeId) === String(idToDelete)) {
          const next = filtered[0]?.id ?? null;
          setActiveId(next);
          if (next) navigation.navigate("Chat", { chatId: next });
          else navigation.navigate("Home");
        }
      } catch (e) {
        console.warn("deleteChat error", e);
      }
    },
    [activeId, navigation]
  );

  const confirmDelete = (chat) => {
    Alert.alert(
      "Eliminar chat",
      `¿Eliminar "${chat.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteChat(chat.id) },
      ],
      { cancelable: true }
    );
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
            right={(props) => (
              <IconButton
                {...props}
                icon="delete"
                size={18}
                style = { style.buttonTrash }
                onPress={() => confirmDelete(chat)}
                accessibilityLabel={`Eliminar chat ${chat.name}`}
              />
            )}
          />
        ))}
      </PaperDrawer.Section>
    </DrawerContentScrollView>
  );
};

export default forwardRef(ChatsDrawer);

const style = {
  
  listItems: {
    backgroundColor: "#7c7b7bff",
    height: 50,
    marginVertical: 5,
    borderRadius: 30,
  },
  buttonTrash: {
    backgroundColor: "#ffffffff",
    borderRadius: 50,
    marginRight: -10,
  },
};
