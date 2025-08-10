import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, useNavigation, DrawerActions } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { TypeAnimation } from 'react-native-type-animation';
import { Barpild } from './components/Inicio/barPild';
import ChatsDrawer from './components/Inicio/drawer'; // <- tu lista como contenido del drawer

const Drawer = createDrawerNavigator();

function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <IconButton
        icon="menu"
        size={24}
        iconColor="#fff"
        containerColor="rgba(255,255,255,0.08)" // leve fondo para que se vea siempre
        style={{
          position: 'absolute',
          left: 10,
          top: insets.top + 8, // respeta notch/statusbar
          zIndex: 100,
          borderRadius: 999,
        }}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
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
    </View>
  );
}

function ChatScreen({ route, navigation }) {
  const chatId = route?.params?.chatId;
  const insets = useSafeAreaInsets();

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
      <Text style={{ color: '#cfcdcdff' }}>
        Acá va el contenido del chat…
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <NavigationContainer>
          <Drawer.Navigator
            screenOptions={{
              headerShown: false, // chau barra blanca
              drawerType: 'slide',
              drawerPosition: 'left',
              swipeEdgeWidth: 60,
              drawerStyle: {
                width: 280,
                backgroundColor: '#2b2b2b',
              },
              sceneContainerStyle: {
                backgroundColor: '#232323',
              },
            }}
            drawerContent={(props) => (
              <ChatsDrawer {...props} />
            )}
          >
            <Drawer.Screen
              name="Home"
              component={HomeScreen}
            />
            <Drawer.Screen
              name="Chat"
              component={ChatScreen}
            />
          </Drawer.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
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
});
