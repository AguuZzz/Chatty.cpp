import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { TypeAnimation } from 'react-native-type-animation';

import { Barpild } from '../components/Inicio/barPild';
import CharacterSelector from '../components/Inicio/characterSelector';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.selectorWrap}>
        <CharacterSelector />
      </View>

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

      <TypeAnimation
        sequence={[
          { text: 'Chatty.cpp', typeSpeed: 80, delayBetweenSequence: 4000 },
          { text: 'No cloud', typeSpeed: 80, delayBetweenSequence: 1200 },
          { text: 'Your AI', typeSpeed: 80, delayBetweenSequence: 1200 },
          { text: 'For you', typeSpeed: 80, delayBetweenSequence: 1200 },
          { text: 'Anywhere', typeSpeed: 80, delayBetweenSequence: 1200 },
        ]}
        speed={100}
        repeat={Infinity}
        style={styles.title}
      />

      <Barpild />
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
  selectorWrap: {
    position: 'absolute',
    top: 55,
    left: 100,
  },
  title: {
    color: '#cfcdcdff',
    fontSize: 50,
    marginBottom: 20,
    textAlign: 'center',
    marginLeft: 10,
  },
});
