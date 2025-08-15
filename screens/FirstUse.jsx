import * as React from "react";
import {
  Linking,
  View,
  ScrollView,
  ImageBackground,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Text, Button, useTheme, Icon } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions  } from "@react-navigation/native";

import { downloadModel } from "../utils/downloadModel";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    key: "1",
    title: "Welcome to Chatty.cpp",
    subtitle: "Your local and personal AI chat companion.",
    icon: "robot",
    bgcolor: "#6d6d6dff",
  },
  {
    key: "2",
    title: "Don't worry about privacy",
    subtitle: "Every chat is stored locally on your device.",
    icon: "shield-lock-outline",
    bgcolor: "#6d6d6dff",
  },
  {
    key: "3",
    title: "But first...",
    subtitle: "We need to download the initial model (∼1gb)",
    icon: "download",
    bgcolor: "#6d6d6dff",
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = React.useState(0);
  const [downloading, setDownloading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const scrollRef = React.useRef(null);
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / width));
  };

const handleDownload = async () => {
  try {
    setDownloading(true);
    setProgress(0);
    const uri = await downloadModel((p) => setProgress(p));
    setProgress(1);
    console.log("✅ Modelo listo en:", uri);

    nav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    );
  } catch (err) {
    console.error("❌ Error descargando el modelo:", err);
  } finally {
    setTimeout(() => setDownloading(false), 400);
  }
};

  const pct = Math.round(progress * 100);

  return (
    <ImageBackground
      resizeMode="cover"
      style={[
        styles.bg,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      imageStyle={{ opacity: 0.9 }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ref={scrollRef}
        contentContainerStyle={{ alignItems: "center" }}
      >
        {SLIDES.map((s) => (
          <View key={s.key} style={[styles.slide, { width }]}>
            <View style={styles.hero}>
              <View style={[styles.phoneFrame, { backgroundColor: s.bgcolor }]}>
                <Icon source={s.icon} size={72} color={"white"} />
              </View>
            </View>

            <Text variant="headlineMedium" style={styles.title}>
              {s.title}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {s.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && { width: 10, height: 10, opacity: 1 },
            ]}
          />
        ))}
      </View>

      <View style={styles.ctaBox}>
        {index === 2 && (
          <>
            <Button
              mode="contained"
              onPress={handleDownload}
              disabled={downloading}
              style={styles.signInBtn}
              contentStyle={{ height: 50, backgroundColor: "black" }}
            >
              <View style={styles.progressWrap}>
                {downloading && (
                  <View style={[styles.fill, { width: `${pct}%` }]} />
                )}
                <Text style={styles.btnText}>
                  {downloading
                    ? `Downloading ${pct}%`
                    : "Download initial model"}
                </Text>
              </View>
            </Button>

            <Button
              mode="contained"
              onPress={() => Linking.openURL("https://huggingface.co/unsloth/LFM2-1.2B-GGUF")}
              style={styles.signInBtn}
              contentStyle={{
                height: 50,
                backgroundColor: "#FFD21E",
              }}
              labelStyle={{
                fontWeight: "700",
                color: "#000",
              }}
              icon="link"
            >
              Visit the model page on HuggingFace
            </Button>


          </>
        )}
      </View>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#2c2c2c" },
  slide: {
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  hero: {
    marginTop: -55,
    marginBottom: 12,
    height: height * 0.35,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneFrame: {
    width: 140,
    height: 220,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.95,
  },
  title: { color: "white", textAlign: "center", fontWeight: "700" },
  subtitle: {
    color: "white",
    opacity: 0.9,
    textAlign: "center",
    maxWidth: 300,
  },
  dots: {
    position: "absolute",
    bottom: 200,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: "white",
    opacity: 0.5,
  },
  ctaBox: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  signInBtn: { alignSelf: "stretch", borderRadius: 12, overflow: "hidden" },
  progressWrap: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  btnText: { color: "white", fontWeight: "600" },
});
