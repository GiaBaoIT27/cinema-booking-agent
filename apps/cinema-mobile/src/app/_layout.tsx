import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";
import { colors } from "@/theme/colors";

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackTitle: "Quay lại",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ title: "Đăng nhập", presentation: "modal" }}
        />
        <Stack.Screen name="movies/[id]" options={{ title: "Chi tiết phim" }} />
        <Stack.Screen name="cineplexes/[id]" options={{ title: "Cụm rạp" }} />
        <Stack.Screen
          name="booking/[showtimeId]"
          options={{ title: "Đặt vé" }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
