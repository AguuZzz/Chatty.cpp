import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider } from 'react-native-paper';
import React from 'react';

import ChatsDrawer from './components/Inicio/drawer';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <NavigationContainer>
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
          </Drawer.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
