import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "nucleus.token";

// Readable once the device has been unlocked after boot; never synced to
// iCloud Keychain or restored onto another device.
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY, options);
}

export function saveToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token, options);
}

export function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY, options);
}
