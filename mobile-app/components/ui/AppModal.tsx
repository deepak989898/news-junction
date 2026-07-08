import { Modal, View } from "react-native";
import { AppText } from "./AppText";
import { AppButton } from "./AppButton";

export function AppModal({
  visible,
  title,
  onClose,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full rounded-2xl bg-white p-4">
          <AppText className="text-lg font-semibold">{title}</AppText>
          <AppButton title="Close" className="mt-3" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
