import { StatusBar } from 'expo-status-bar';
import { Barpild } from './components/Inicio/barPild';
import { StyleSheet, Text, View } from 'react-native';
import { TypeAnimation } from 'react-native-type-animation';
import { IconButton, Modal, Portal, Provider } from 'react-native-paper';
import ChatsDrawer from './components/Inicio/drawer';
import { useState } from 'react';

export default function App() {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  return (
    <Provider>
      <View style={styles.container}>
        <IconButton
          icon="history"
          color="#f8f8f8ff"
          size={30}
          style={{ position: 'absolute', top: 40, left: 10 }}
          onPress={() => setIsDrawerVisible(true)}
        />
        <TypeAnimation
          sequence={[
            { text: 'Chatty.cpp', typeSpeed: 80, delayBetweenSequence: 3000 },
            { text: 'Feel secure', typeSpeed: 80, delayBetweenSequence: 1000 },
            { text: 'Feel private', typeSpeed: 80, delayBetweenSequence: 1000 },
            { text: 'Feel free', typeSpeed: 80, delayBetweenSequence: 1000 },
            { text: 'All local', typeSpeed: 80, delayBetweenSequence: 1000 },
          ]}
          speed={100}
          repeat={Infinity}
          style={styles.title}
        />
        <Barpild />

        <Portal>
          <Modal
            visible={isDrawerVisible}
            onDismiss={() => setIsDrawerVisible(false)}
            contentContainerStyle={styles.modalContent}>
            <ChatsDrawer
              onSelectChat={(chatId) => {
                console.log('Selected chat:', chatId);
                setIsDrawerVisible(false);
              }}
            />
          </Modal>
        </Portal>
      </View>
    </Provider>
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
    fontSize: 50,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: '#333333',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
});
