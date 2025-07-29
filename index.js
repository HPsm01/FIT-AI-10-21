import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App.js';
import 'expo-asset';

import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Possible Unhandled Promise Rejection']);

registerRootComponent(App);
