import * as Linking from "expo-linking";

export function createAppLink(path: string) {
  return Linking.createURL(path);
}
