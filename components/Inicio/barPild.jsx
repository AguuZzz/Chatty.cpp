import React, { useState } from "react";
import { TextInput, View, StyleSheet } from "react-native";
import { IconButton } from "react-native-paper";



export const Barpild = ({ placeholder = null, onSend }) => {
  const [text, setText] = useState("");
  

  const handleSend = () => {
    setText("");
    if (!text.trim()) return;
    onSend && onSend(text.trim());
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.textinput, { flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor="#cfcdcdff"
        value={text}
        onChangeText={setText}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />
      <IconButton
        icon="send"
        mode="contained"
        style={styles.button}
        iconColor="#000000"
        size={18}
        onPress={handleSend}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#504d4dff",
        borderRadius: 50,
        paddingHorizontal: 10,
        height: 45,
        width: 350,
    },
    textinput: {
        color: "#cfcdcdff",
        textAlign: "center",
        flexShrink: 3,
        marginLeft: 45,
    },
    button: {
        backgroundColor: "#ffffff",
        borderRadius: 50,
        marginLeft: 10,
    },
});
