import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AppText } from "./AppText";

export function BottomSheetPlaceholder() {
  return (
    <Animated.View entering={FadeInUp} className="rounded-t-3xl border border-slate-200 bg-white p-4">
      <AppText className="font-semibold">Bottom Sheet Placeholder</AppText>
    </Animated.View>
  );
}
