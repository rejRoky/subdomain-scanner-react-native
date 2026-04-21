import '@expo/metro-runtime';
import React, { useEffect, Component } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/database';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0f172a', padding: 20 }}>
          <Text style={{ color: '#f87171', fontSize: 18, fontWeight: 'bold', marginTop: 40 }}>
            Runtime Error
          </Text>
          <Text style={{ color: '#e2e8f0', marginTop: 12, fontFamily: 'monospace', fontSize: 13 }}>
            {String(this.state.error)}
          </Text>
          <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 12 }}>
            {(this.state.error as any)?.stack ?? ''}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    try { initDatabase(); } catch {}
  }, []);

  return (
    <ErrorBoundary>
      <View style={styles.root}>
        <StatusBar style="light" />
        <AppNavigator />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export default registerRootComponent(App);
