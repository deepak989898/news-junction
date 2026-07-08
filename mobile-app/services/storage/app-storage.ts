import AsyncStorage from "@react-native-async-storage/async-storage";

export async function setStorageItem(key: string, value: string) {
  await AsyncStorage.setItem(key, value);
}

export async function getStorageItem(key: string) {
  return AsyncStorage.getItem(key);
}

export async function removeStorageItem(key: string) {
  await AsyncStorage.removeItem(key);
}
