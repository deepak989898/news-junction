import { ActivityIndicator, View } from "react-native";

export function Loader() {
  return (
    <View className="items-center justify-center py-6">
      <ActivityIndicator size="small" color="#0f172a" />
    </View>
  );
}
