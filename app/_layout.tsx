import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#333' },
          tabBarActiveTintColor: '#4fc3f7',
          tabBarInactiveTintColor: '#888',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="upload"
          options={{
            title: 'Upload',
            tabBarIcon: ({ color, size }) => <Ionicons name="camera" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="compare"
          options={{
            title: 'Compare',
            tabBarIcon: ({ color, size }) => <Ionicons name="git-compare" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="trends"
          options={{
            title: 'Trends',
            tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
          }}
        />
        <Tabs.Screen name="workout/[id]" options={{ href: null, title: 'Workout' }} />
      </Tabs>
    </>
  );
}
