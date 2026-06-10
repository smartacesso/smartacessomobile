import { useAppColors } from '@/hooks/useAppColors';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

interface AuthenticatedImageProps {
  uri: string;
  authToken: string;
  style?: StyleProp<ImageStyle>;
}

export function AuthenticatedImage({ uri, authToken, style }: AuthenticatedImageProps) {
  const colors = useAppColors();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return (
    <View style={[styles.wrap, style]}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      )}
      <Image
        source={{
          uri,
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'image/jpeg, image/png, */*',
          },
        }}
        style={[StyleSheet.absoluteFill, styles.image]}
        resizeMode="cover"
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
