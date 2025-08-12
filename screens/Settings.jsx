// screens/AjustesLLM.jsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import configInit from "../assets/jsons/config.json"; // archivo base inicial

const CONFIG_PATH = FileSystem.documentDirectory + "config.json";

export default function AjustesLLM({ navigation }) {
  const insets = useSafeAreaInsets();

  const [nBatch, setNBatch] = useState(256);
  const [nCtx, setNCtx] = useState(2048);      // numérico directo
  const [threads, setThreads] = useState(4);   // slider

  // Copia el config inicial si no existe
  async function ensureConfig() {
    const fileInfo = await FileSystem.getInfoAsync(CONFIG_PATH);
    if (!fileInfo.exists) {
      await FileSystem.writeAsStringAsync(
        CONFIG_PATH,
        JSON.stringify(configInit, null, 2)
      );
    }
  }

  // Carga config.json desde FS
  async function loadConfig() {
    await ensureConfig();
    const data = await FileSystem.readAsStringAsync(CONFIG_PATH);
    const parsed = JSON.parse(data);
    setNBatch(parsed.n_batch ?? 256);
    setNCtx(Number(parsed.n_ctx ?? 2048));
    setThreads(Number(parsed.threads ?? 4));
  }

  // Guarda cambios en config.json
  async function saveConfig() {
    const newConfig = {
      n_batch: nBatch,
      n_ctx: Math.max(256, Math.floor(nCtx) || 2048), // guardrail mínimo
      threads: Math.max(1, Math.floor(threads) || 4),
    };
    await FileSystem.writeAsStringAsync(
      CONFIG_PATH,
      JSON.stringify(newConfig, null, 2)
    );
    navigation.goBack(); // vuelve a la pantalla anterior
  }

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="light" backgroundColor="#232323" />

      <Text style={styles.title}>⚙ Ajustes LLM</Text>

      {/* n_batch */}
      <Text style={styles.label}>n_batch: {nBatch}</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1024}
        step={1}
        value={nBatch}
        onValueChange={setNBatch}
      />

      {/* n_ctx */}
      <Text style={styles.label}>n_ctx: {nCtx}</Text>
      <Slider
        style={styles.slider}
        minimumValue={256}
        maximumValue={8192}
        step={64}
        value={nCtx}
        onValueChange={setNCtx}
      />

      {/* threads (slider) */}
      <Text style={styles.label}>threads: {threads}</Text>
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={8}     // podés subir a 16 si tu device lo banca
        step={1}
        value={threads}
        onValueChange={setThreads}
      />

      <Button mode="contained" onPress={saveConfig} style={{ marginTop: 20 }}>
        Guardar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#232323" }, // 👈 sin marginTop
  title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  label: { color: "#fff", marginBottom: 8, marginTop: 12 },
  slider: { width: "100%", height: 40 },
});
