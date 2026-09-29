import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session } = useAuth();

  // SDK 57 has no `redirectTo`: a blocked route falls back to the first
  // available screen, so exactly one of these is reachable at a time.
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
      </Stack.Protected>
    </Stack>
  );
}
