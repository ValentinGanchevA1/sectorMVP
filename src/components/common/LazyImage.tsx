// src/components/common/LazyImage.tsx
import React, { useState } from 'react';
import { Image, ActivityIndicator, View } from 'react-native';

interface LazyImageProps {
  uri: string;
  style?: any;
  placeholder?: React.ReactNode;
}

export const LazyImage: React.FC<LazyImageProps> = ({ uri, style, placeholder }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={style}>
      {loading && (placeholder || <ActivityIndicator />)}
      <Image
        source={{ uri }}
        style={[style, { display: loading ? 'none' : 'flex' }]}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        resizeMode="cover"
      />
    </View>
  );
};
