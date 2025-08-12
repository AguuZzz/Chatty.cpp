import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider } from 'react-native-paper';
import React, { useEffect, useState } from 'react';

import store  from './utils/storeinfo';
import ChatsDrawer from './components/Inicio/drawer';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import OnboardingScreen from './screens/FirstUse';
import AjustesLLM from './screens/Settings';

import { checkModelExists } from './utils/downloadModel';

const Drawer = createDrawerNavigator();



export default function App() {
  const [hasModel, setHasModel] = useState(null);

  useEffect(() => {
    (async () => {
      await store.initStore?.();
      try {
        const exists = await checkModelExists();
        setHasModel(exists);
        console.log('Modelo existe:', exists);
      } catch (e) {
        console.warn('Error checking model:', e);
        setHasModel(false);
        console.log('Modelo no existe:');
      }
    })();
  }, []);

  if (hasModel === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <NavigationContainer>
          {hasModel ? (
            <Drawer.Navigator
              screenOptions={{
                headerShown: false,
                drawerType: 'slide',
                drawerPosition: 'left',
                swipeEdgeWidth: 60,
                drawerStyle: { width: 280, backgroundColor: '#2b2b2b' },
                sceneContainerStyle: { backgroundColor: '#232323' },
              }}
              drawerContent={(props) => <ChatsDrawer {...props} />}
            >
              <Drawer.Screen name="Home" component={HomeScreen} />
              <Drawer.Screen name="Chat" component={ChatScreen} />
              <Drawer.Screen name="Ajustes LLM" component={AjustesLLM} />
            </Drawer.Navigator>
          ) : (
            <OnboardingScreen />
          )}
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
