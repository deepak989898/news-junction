import { Switch, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { useReaderSettings } from "@/providers/ReaderSettingsProvider";
import { useI18n } from "@/hooks/useI18n";

export default function DataSaverSettingsScreen() {
  const { t } = useI18n();
  const { dataSaver, lowImageMode, wifiOnlyDownloads, autoDownload, setDataSaver, setLowImageMode, setWifiOnlyDownloads, setAutoDownload } =
    useReaderSettings();

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("dataSaver")} />
      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
          <AppText>{t("dataSaver")}</AppText>
          <Switch value={dataSaver} onValueChange={setDataSaver} />
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
          <AppText>{t("lowImageMode")}</AppText>
          <Switch value={lowImageMode} onValueChange={setLowImageMode} />
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
          <AppText>{t("wifiOnlyDownloads")}</AppText>
          <Switch value={wifiOnlyDownloads} onValueChange={setWifiOnlyDownloads} />
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
          <AppText>{t("autoDownload")}</AppText>
          <Switch value={autoDownload} onValueChange={setAutoDownload} />
        </View>
        <View className="rounded-2xl bg-white px-4 py-4">
          <AppText className="text-slate-600">{t("backgroundSyncHint")}</AppText>
        </View>
      </View>
    </View>
  );
}
