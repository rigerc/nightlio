import { View } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 16, radius = 8 }: SkeletonProps) {
  return (
    <View
      className="bg-muted animate-pulse"
      style={{ width, height, borderRadius: radius }}
    />
  );
}
