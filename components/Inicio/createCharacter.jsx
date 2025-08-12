import * as React from "react";
import { View } from "react-native";
import { Drawer, Button, useTheme, TextInput } from "react-native-paper";
import store from "../../utils/storeinfo"; // 👈 para leer/escribir el JSON mutable

export default function CharacterCreator({ onClose }) {
  const [name, setName] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  const [sysprompt, setSysprompt] = React.useState("");
  const theme = useTheme();

  const handleSave = async () => {
    // Evitar guardar vacío
    if (!name.trim()) return;

    // Leer el JSON actual
    const characters = await store.readJSON("characters");

    // Crear nuevo personaje
    const newChar = {
      name: name.trim(),
      emoji: emoji.trim() || "👤",
      sysprompt: sysprompt.trim(),
    };

    // Guardar al final de la lista
    await store.writeJSON("characters", [...characters, newChar]);

    // Cerrar modal
    onClose?.();
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
            await handleSave(); // guarda el personaje
            onSave?.(); // avisa al selector que recargue
        }}
        >
        Save
        </Button>
      </View>
    </View>
  );
}
