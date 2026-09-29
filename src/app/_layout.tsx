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
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
      </Stack.Protected>
    </Stack>
  );
}
