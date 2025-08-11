// CharacterSelector.jsx — SOLO EMOJIS (RNP v4/v5)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Menu, Text, TouchableRipple, Avatar, useTheme } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import charactersData from "../../constants/characters.json";

const STORAGE_KEY = "selectedCharacter";

export default function CharacterSelector({ label = "Select AI role", onChange }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);
  const theme = useTheme();
  const useMenuAnchor = useRef(Boolean(Menu && Menu.Anchor)).current;

  const options = useMemo(
    () =>
      charactersData.map((c) => ({
        name: c.name,
        description: c.description,
        emoji: c.emoji || "👤",
      })),
    []
  );

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const initial = stored ? options.find(o => o.name === stored) : options[0];
      setCurrent(initial);
      onChange?.(initial);
    })();
  }, [options, onChange]);

  const handleSelect = async (opt) => {
    setCurrent(opt);
    onChange?.(opt);
    await AsyncStorage.setItem(STORAGE_KEY, opt.name);
    setVisible(false);
  };

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

  const items = options.map((opt) => (
    <Menu.Item
      key={opt.name}
      onPress={() => handleSelect(opt)}
      title={
        <View style={styles.row}>
          <Avatar.Text size={24} label={opt.emoji} style={styles.itemAvatar} />
          <Text style={styles.itemText}>{opt.name}</Text>
        </View>
      }
    />
  ));

  const AnchorWrap = <View collapsable={false} pointerEvents="box-none">{AnchorButton}</View>;

  return (
    <View style={styles.wrap}>
      {useMenuAnchor ? (
        <Menu visible={visible} onDismiss={() => setVisible(false)} contentStyle={styles.menu}>
          <Menu.Anchor>{AnchorWrap}</Menu.Anchor>
          {items}
        </Menu>
      ) : (
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchor={AnchorWrap}
          contentStyle={styles.menu}
        >
          {items}
        </Menu>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    wrap: {
        alignSelf: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    pill: {
        width: 250,
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    avatar: {
        backgroundColor: "transparent",
        marginRight: 10,
    },
    pillText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
    },
    chev: {
        fontSize: 16,
        opacity: 0.7,
        marginLeft: 6,
    },
    menu: {
        borderRadius: 14,
        overflow: "hidden",
        minWidth: 250,
        marginTop: 45,
    },
    itemAvatar: {
        backgroundColor: "transparent",
        marginRight: 10,
    },
    itemText: {
        fontSize: 15,
    },
});
