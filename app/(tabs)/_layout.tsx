import { HapticTab } from '@/components/haptic-tab';
import { Tabs } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  return (    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
