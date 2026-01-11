import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from './screens/LandingScreen';
import HomeScreen from './screens/HomeScreen';
import UserScreen from './screens/UserScreen';
import AdminScreen from './screens/AdminScreen';
import ServiceSetupScreen from './screens/ServiceSetupScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="User" component={UserScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="ServiceSetup" component={ServiceSetupScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

