import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useEffect } from "react";

export function Skeleton({ width = "100%", height = 16 }: { width?: string | number; height?: number }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width,
    height,
  }));

  return <Animated.View style={style} className="rounded-md bg-slate-300" />;
}
