"use client";

import { useCallback, useState } from "react";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export type LocationStatus = "idle" | "loading" | "denied" | "error";

/**
 * Chỉ xin quyền vị trí khi người dùng bấm "Rạp gần tôi".
 * Toạ độ được trả qua callback để ghi thẳng lên URL (nguồn sự thật duy nhất).
 */
export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");

  const request = useCallback((onSuccess: (location: UserLocation) => void) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("idle");
        onSuccess({
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
        });
      },
      (err) =>
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  return { status, request };
}
