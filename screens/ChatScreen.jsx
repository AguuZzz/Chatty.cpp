import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';

export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const chatId = route?.params?.chatId;

  return (
    <View style={styles.container}>
      <IconButton
        icon="menu"
        size={24}
        iconColor="#fff"
        containerColor="rgba(255,255,255,0.08)"
        style={{
          position: 'absolute',
          left: 10,
          top: insets.top + 8,
          zIndex: 100,
          borderRadius: 999,
        }}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <Text style={styles.title}>Chat: {chatId ?? '—'}</Text>
      <Text style={styles.subtitle}>Acá va el contenido del chat…</Text>
      {/* TODO: renderizar mensajes según chatId */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#232323',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#cfcdcdff',
    fontSize: 36,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#cfcdcdff',
    opacity: 0.8,
  },
});
