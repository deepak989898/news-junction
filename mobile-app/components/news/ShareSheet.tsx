import { Modal, Pressable, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import {
  copyArticleLink,
  shareArticleNative,
  shareToFacebook,
  shareToLinkedIn,
  shareToTelegram,
  shareToWhatsApp,
  shareToX,
  shareViaEmail,
  shareViaSms,
} from "@/services/share/share";

const OPTIONS = [
  { key: "native", label: "Share" },
  { key: "copy", label: "Copy Link" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
] as const;

export function ShareSheet({
  visible,
  onClose,
  title,
  url,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  url: string;
}) {
  const onSelect = async (key: (typeof OPTIONS)[number]["key"]) => {
    try {
      if (key === "native") await shareArticleNative(title, url);
      if (key === "copy") await copyArticleLink(url);
      if (key === "whatsapp") await shareToWhatsApp(title, url);
      if (key === "telegram") await shareToTelegram(title, url);
      if (key === "facebook") await shareToFacebook(url);
      if (key === "x") await shareToX(title, url);
      if (key === "linkedin") await shareToLinkedIn(url);
      if (key === "email") await shareViaEmail(title, url);
      if (key === "sms") await shareViaSms(title, url);
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <View className="rounded-t-3xl bg-white p-4">
          <AppText className="mb-3 text-lg font-bold">Share article</AppText>
          {OPTIONS.map((opt) => (
            <Pressable key={opt.key} onPress={() => onSelect(opt.key)} className="border-b border-slate-100 py-3">
              <AppText>{opt.label}</AppText>
            </Pressable>
          ))}
          <Pressable onPress={onClose} className="mt-2 py-3">
            <AppText className="text-center text-red-600">Cancel</AppText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
