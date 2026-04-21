/**
 * AppNavigator
 *
 * React Navigation stack: Login → MaterialList → ReadingSession → Feedback
 * TeacherDashboard is accessible from MaterialList for teacher/admin users.
 *
 * Requirements: 2.1, 3.3, 8.3
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReadingMaterial } from '../types';

import LoginScreen from '../screens/LoginScreen';
import MaterialListScreen from '../screens/MaterialListScreen';
import ReadingSessionScreen from '../screens/ReadingSessionScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import TeacherDashboardScreen from '../screens/TeacherDashboardScreen';

import RegisterScreen from '../screens/RegisterScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MaterialList: undefined;
  ReadingSession: { material: ReadingMaterial };
  Feedback: { recordingUri: string; material: ReadingMaterial };
  TeacherDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
      <Stack.Screen name="MaterialList" component={MaterialListScreen} options={{ title: 'Reading Materials' }} />
      <Stack.Screen name="ReadingSession" component={ReadingSessionScreen} options={{ title: 'Reading Session' }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback' }} />
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ title: 'Teacher Dashboard' }} />
    </Stack.Navigator>
  );
}
