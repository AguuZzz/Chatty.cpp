// CharacterSelector.jsx
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Menu,
  Text,
  TouchableRipple,
  Avatar,
  useTheme,
  Portal,
  Modal,
  Icon,
  IconButton,
  Divider,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import store from "../../utils/storeinfo";
import CharacterCreator from "./createCharacter";

const STORAGE_KEY = "selectedCharacter";

export default function CharacterSelector({ label = "Select AI role", onChange }) {
  const [visible, setVisible] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [options, setOptions] = useState([]);
  const theme = useTheme();
  const useMenuAnchor = useRef(Boolean(Menu && Menu.Anchor)).current;

  const loadCharacters = async () => {
    await store.initStore();
    const charactersData = await store.readJSON("characters");
    const mapped = charactersData.map((c) => ({
      name: c.name,
      description: c.description,
      emoji: c.emoji || "👤",
    }));
    setOptions(mapped);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const initial = stored ? mapped.find((o) => o.name === stored) : mapped[0];
    setCurrent(initial || null);
    if (initial) onChange?.(initial);
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  const handleSelect = async (opt) => {
    setCurrent(opt);
    onChange?.(opt);
    await AsyncStorage.setItem(STORAGE_KEY, opt.name);
    setVisible(false);
  };

  const handleDelete = async (name) => {
    const characters = await store.readJSON("characters");
    const filtered = characters.filter((c) => c.name !== name);
    await store.writeJSON("characters", filtered);

    // si borraste el actual, eligí el primero
    if (current?.name === name) {
      const next = filtered[0]
        ? { name: filtered[0].name, emoji: filtered[0].emoji || "👤" }
        : null;
      setCurrent(next);
      await AsyncStorage.setItem(STORAGE_KEY, next?.name || "");
      onChange?.(next || null);
    }

    await loadCharacters();
  };

  const openCreator = () => {
    setVisible(false);
    setTimeout(() => setCreatorOpen(true), 10);
  };
  const closeCreator = () => setCreatorOpen(false);

  const AnchorButton = (
    <TouchableRipple
      onPress={() => setVisible(true)}
      style={[styles.pill, { backgroundColor: theme.colors.elevation.level2 }]}
      rippleColor="rgba(255,255,255,0.1)"
      borderless
    >
      <View style={styles.row}>
        <Avatar.Text size={28} label={current?.emoji || "👤"} style={styles.avatar} />
        <Text style={styles.pillText} numberOfLines={1}>
          {current ? current.name : label}
        </Text>
        <Text style={styles.chev}>▾</Text>
      </View>
    </TouchableRipple>
  );

  const MenuContent = (
    <View style={styles.menuWrap}>
      {options.map((opt, idx) => (
        <View key={opt.name}>
          <View style={styles.itemRow}>
            <TouchableRipple
              onPress={() => handleSelect(opt)}
              rippleColor="rgba(255,255,255,0.08)"
              style={styles.itemTouchable}
              borderless
            >
              <View style={styles.row}>
                <Avatar.Text size={24} label={opt.emoji} style={styles.itemAvatar} />
                <Text style={styles.itemText}>{opt.name}</Text>
              </View>
            </TouchableRipple>

            {opt.name !== current?.name && (
              <IconButton
                icon="delete-outline"
                size={18}
                onPress={() => handleDelete(opt.name)}
                accessibilityLabel={`Delete ${opt.name}`}
              />
            )}
          </View>
          {idx < options.length - 1 && <Divider />}
        </View>
      ))}

      <Divider style={{ marginTop: 4 }} />
      <TouchableRipple
        onPress={openCreator}
        rippleColor="rgba(255,255,255,0.08)"
        style={styles.createRow}
        borderless
      >
        <View style={[styles.row, { paddingHorizontal: 12, paddingVertical: 10 }]}>
          <Icon source="file-edit-outline" size={22} />
          <Text style={[styles.itemText, { marginLeft: 10 }]}>Add new character</Text>
        </View>
      </TouchableRipple>
    </View>
  );

  const AnchorWrap = <View collapsable={false} pointerEvents="box-none">{AnchorButton}</View>;

  return (
    <View style={styles.wrap}>
      {useMenuAnchor ? (
        <Menu visible={visible} onDismiss={() => setVisible(false)} contentStyle={styles.menu}>
          <Menu.Anchor>{AnchorWrap}</Menu.Anchor>
          {MenuContent}
        </Menu>
      ) : (
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchor={AnchorWrap}
          contentStyle={styles.menu}
        >
          {MenuContent}
        </Menu>
      )}

      <Portal>
        <Modal
          visible={creatorOpen}
          onDismiss={closeCreator}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <CharacterCreator
            onClose={closeCreator}
            onSave={() => {
              closeCreator();
              loadCharacters(); // refresca al toque
            }}
          />
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  pill: {
    width: 250,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  avatar: { backgroundColor: "transparent", marginRight: 10 },
  pillText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
  },
  chev: { fontSize: 16, opacity: 0.7, marginLeft: 6 },
  menu: { borderRadius: 14, overflow: "hidden", minWidth: 250, marginTop: 45 },
  menuWrap: { paddingVertical: 4 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 2,
  },
  itemTouchable: { flex: 1, paddingVertical: 8, paddingHorizontal: 6 },
  itemAvatar: { backgroundColor: "transparent", marginRight: 10 },
  itemText: { fontSize: 15 },
  modal: { marginHorizontal: 16, borderRadius: 16, padding: 16 },
});
