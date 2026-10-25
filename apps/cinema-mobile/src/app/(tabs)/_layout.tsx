import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ColorValue, OpaqueColorValue } from "react-native";
import { colors } from "@/theme/colors";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type TabIconProps = {
  focused: boolean;
  color: ColorValue;
  size: number;
};

/** react-navigation truyền `color` dạng ColorValue (có thể null/number), Ionicons chỉ nhận string | OpaqueColorValue. */
function toIconColor(color: ColorValue): string | OpaqueColorValue {
  if (typeof color === "string" || typeof color === "symbol") return color;
  return colors.text;
}

const icon = (name: IconName) =>
  function TabIcon({ color, size }: TabIconProps) {
    return <Ionicons name={name} color={toIconColor(color)} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Phim", tabBarIcon: icon("film-outline") }}
      />
      <Tabs.Screen
        name="cineplexes"
        options={{ title: "Rạp", tabBarIcon: icon("location-outline") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Tài khoản", tabBarIcon: icon("person-outline") }}
      />
    </Tabs>
  );
}
