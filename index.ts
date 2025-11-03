import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';

import App from './App';

// Register a background handler for FCM messages. This must be registered
// at the JS entry point (outside React lifecycle) so background/quit messages
// are delivered to the JS runtime.
try {
	messaging().setBackgroundMessageHandler(async (remoteMessage) => {
		console.log('FCM background message received:', remoteMessage);
		// You can perform background work here (e.g., update local DB)
	});
} catch (err) {
	console.warn('Failed to set background message handler:', err);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
