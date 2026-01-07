import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import UserScreen from './screens/UserScreen';
import AdminScreen from './screens/AdminScreen';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator initialRouteName="Home">
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="User"
                    component={UserScreen}
                    options={{ title: 'Queue User' }}
                />
                <Stack.Screen
                    name="Admin"
                    component={AdminScreen}
                    options={{ title: 'Queue Admin' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
