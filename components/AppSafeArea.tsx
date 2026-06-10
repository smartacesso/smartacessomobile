import React from 'react';
import { StyleSheet } from 'react-native';
import {
  SafeAreaView,
  type SafeAreaViewProps,
} from 'react-native-safe-area-context';

type AppSafeAreaProps = SafeAreaViewProps;

/** Respeita status bar e navigation bar no Android edge-to-edge (ex.: S24). */
export function AppSafeArea({
  edges = ['top', 'left', 'right', 'bottom'],
  style,
  ...props
}: AppSafeAreaProps) {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
