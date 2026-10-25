import { useCallback, useState } from "react";
import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export type LocationStatus = "idle" | "loading" | "denied" | "error";

/** Chỉ xin quyền vị trí khi người dùng bấm "Rạp gần tôi". */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const request = useCallback(async () => {
    setStatus("loading");
    try {
      const { status: permission } =
        await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: Number(pos.coords.latitude.toFixed(4)),
        longitude: Number(pos.coords.longitude.toFixed(4)),
      });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  const clear = useCallback(() => {
    setLocation(null);
    setStatus("idle");
  }, []);

  return { location, status, request, clear };
}
