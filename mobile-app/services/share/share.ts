import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { Linking, Platform, Share } from "react-native";

export async function shareArticleNative(title: string, url: string) {
  await Share.share({ title, message: Platform.OS === "ios" ? title : `${title}\n${url}`, url });
}

export async function copyArticleLink(url: string) {
  await Clipboard.setStringAsync(url);
}

export async function shareToWhatsApp(title: string, url: string) {
  const message = encodeURIComponent(`${title}\n${url}`);
  const waUrl = `whatsapp://send?text=${message}`;
  const can = await Linking.canOpenURL(waUrl);
  if (can) await Linking.openURL(waUrl);
  else await shareArticleNative(title, url);
}

export async function shareToTelegram(title: string, url: string) {
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  await Linking.openURL(tgUrl);
}

export async function shareToFacebook(url: string) {
  await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
}

export async function shareToX(title: string, url: string) {
  await Linking.openURL(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  );
}

export async function shareToLinkedIn(url: string) {
  await Linking.openURL(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
}

export async function shareViaEmail(title: string, url: string) {
  await Linking.openURL(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`);
}

export async function shareViaSms(title: string, url: string) {
  const body = encodeURIComponent(`${title} ${url}`);
  await Linking.openURL(Platform.OS === "ios" ? `sms:&body=${body}` : `sms:?body=${body}`);
}

export async function systemShareFile(uri: string) {
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
}
