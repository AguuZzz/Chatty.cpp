import * as React from "react";
import { View } from "react-native";
import { Drawer, Button, useTheme, TextInput } from "react-native-paper";
import store from "../../utils/storeinfo";

export default function CharacterCreator({ onClose, onSave }) { // 👈 recibí onSave
  const [name, setName] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  const [sysprompt, setSysprompt] = React.useState("");
  const theme = useTheme();

  const handleSave = async () => {
    if (!name.trim()) return null; // no guardes vacío

    // (opcional) asegurate de que exista el store
    await store.initStore();

    const characters = await store.readJSON("characters");

    const newChar = {
      name: name.trim(),
      emoji: (emoji || "👤").trim(),
      sysprompt: sysprompt.trim(),
    };

    await store.writeJSON("characters", [...characters, newChar]);

    return newChar; // 👈 devolvemos el creado
  };

  return (
    <View>
      <Drawer.Section title="Create a new character" showDivider={false}>
        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          style={{ marginBottom: 16 }}
        />
        <TextInput
          label="Emoji"
          value={emoji}
          onChangeText={setEmoji}
          style={{ marginBottom: 16 }}
        />
        <TextInput
          label="System Prompt"
          value={sysprompt}
          onChangeText={setSysprompt}
          style={{ marginBottom: 16, height: 100 }}
          multiline
        />
      </Drawer.Section>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Button onPress={onClose} mode="text">
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={async () => {
            const newChar = await handleSave();   // 👈 ahora lo tenés acá
            if (newChar) {
              onSave?.(newChar);                  // 🔔 avisás al padre
              onClose?.();                        // y cerrás
            }
          }}
          disabled={!name.trim()}
        >
          Save
        </Button>
      </View>
    </View>
  );
}
