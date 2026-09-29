import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";

// Hold the splash until the stored session is checked, so login doesn't flash
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== "restoring") SplashScreen.hide();
  }, [status]);

  if (status === "restoring") return null;

  // SDK 57 has no `redirectTo`: a blocked route falls back to the first
  // available screen, so exactly one of these is reachable at a time.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
