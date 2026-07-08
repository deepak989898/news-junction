import { useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, View, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Image } from "expo-image";
import { AppText } from "@/components/ui/AppText";

const { width, height } = Dimensions.get("window");

export function ArticleGallery({
  images,
  captions,
}: {
  images: string[];
  captions?: string[];
}) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (!images.length) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const GalleryBody = ({ full }: { full?: boolean }) => (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {images.map((uri, i) => (
          <Pressable key={uri + i} onPress={() => setFullscreen(true)}>
            <Image
              source={{ uri }}
              style={{ width: full ? width : width - 32, height: full ? height * 0.7 : 220, marginHorizontal: full ? 0 : 16 }}
              contentFit={full ? "contain" : "cover"}
            />
          </Pressable>
        ))}
      </ScrollView>
      <AppText className="mt-2 text-center text-xs text-slate-500">
        {index + 1} / {images.length}
      </AppText>
      {captions?.[index] ? (
        <AppText className="mt-1 px-4 text-center text-sm text-slate-600">{captions[index]}</AppText>
      ) : null}
    </View>
  );

  return (
    <>
      <GalleryBody />
      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <View className="flex-1 bg-black">
          <Pressable onPress={() => setFullscreen(false)} className="absolute right-4 top-12 z-10 rounded-full bg-white/20 px-3 py-1">
            <AppText className="text-white">Close</AppText>
          </Pressable>
          <View className="flex-1 justify-center">
            <GalleryBody full />
          </View>
        </View>
      </Modal>
    </>
  );
}
