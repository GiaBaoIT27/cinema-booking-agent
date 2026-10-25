"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Cấu hình đầy đủ icon marker của Leaflet trong môi trường Next.js/React
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface TileProvider {
  id: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  tileSize?: number;
  zoomOffset?: number;
}

/**
 * Nguồn tile theo thứ tự ưu tiên. Nếu nguồn đầu liên tục lỗi (bị chặn, mất mạng
 * tới máy chủ tile, ...) bản đồ tự chuyển sang nguồn kế tiếp thay vì để nền xám.
 */
const FREE_TILE_PROVIDERS: TileProvider[] = [
  {
    // Dự phòng số 1: tải được trên máy dev của dự án (OSM chuẩn từng bị lỗi tile).
    id: "osm-france",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    attribution:
      '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    maxZoom: 20,
    subdomains: "abc",
  },
  {
    id: "osm",
    // Không dùng {s} (a/b/c): OSM đã khuyến nghị bỏ subdomain.
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    // Esri: thứ tự tham số là {z}/{y}/{x} (khác OSM).
    id: "esri-street",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS",
    maxZoom: 19,
  },
];

/**
 * Mapbox (tuỳ chọn): chỉ bật khi có NEXT_PUBLIC_MAPBOX_TOKEN.
 * - Token phải là public token (bắt đầu bằng "pk."), và nên giới hạn theo URL
 *   của website trong dashboard Mapbox. Secret token ("sk.") bị từ chối vì
 *   biến NEXT_PUBLIC_* nằm trong code trình duyệt, ai cũng đọc được.
 * - NEXT_PUBLIC_MAPBOX_STYLE (tuỳ chọn): mặc định "mapbox/dark-v11" hợp giao
 *   diện tối; đổi sang "mapbox/streets-v12" nếu muốn bản đồ sáng.
 * Lỗi token/quota thì bản đồ tự rơi về OSM nhờ cơ chế fallback bên dưới.
 */
// .trim(): file .env sửa trên Windows hay dính khoảng trắng/xuống dòng thừa.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE?.trim() || "mapbox/dark-v11";

function buildMapboxProvider(): TileProvider | null {
  if (!MAPBOX_TOKEN) return null;
  if (!MAPBOX_TOKEN.startsWith("pk.")) {
    console.error(
      "[map] NEXT_PUBLIC_MAPBOX_TOKEN phải là public token (pk.), bỏ qua Mapbox.",
    );
    return null;
  }
  return {
    id: "mapbox",
    // Tile 512px + zoomOffset -1: cùng vùng nhìn nhưng ít request hơn tile 256px.
    url: `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/512/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
    attribution:
      '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/about/" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    maxZoom: 19,
    tileSize: 512,
    zoomOffset: -1,
  };
}

const MAPBOX_PROVIDER = buildMapboxProvider();

// Các log [map] hiện ở cả bản build production (docker, next start) để dễ gỡ lỗi.
// Không log token: chỉ in tên nguồn, style và URL đã bỏ query string.
if (typeof window !== "undefined") {
  console.info(
    MAPBOX_PROVIDER
      ? `[map] Mapbox đã bật (style: ${MAPBOX_STYLE})`
      : "[map] Mapbox TẮT: không đọc được NEXT_PUBLIC_MAPBOX_TOKEN. Kiểm tra file .env.local nằm trong thư mục apps/cinema-frontend-v1 và khởi động lại dev server.",
  );
}

let mapboxDiagnosed = false;

/**
 * Chạy một lần khi tile Mapbox lỗi: gọi thử một tile Mapbox để đọc mã HTTP và
 * thông báo lỗi thật (401 token sai, 403 bị giới hạn URL, 404 sai style, ...)
 * mà thẻ <img> của Leaflet không cho biết.
 */
async function diagnoseMapbox() {
  if (mapboxDiagnosed || !MAPBOX_TOKEN) return;
  mapboxDiagnosed = true;
  try {
    const res = await fetch(
      `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/512/0/0/0?access_token=${MAPBOX_TOKEN}`,
    );
    if (res.ok) {
      console.warn(
        "[map] Mapbox trả 200 cho tile thử nhưng tile trên bản đồ vẫn lỗi: kiểm tra giới hạn URL của token hoặc tiện ích chặn request.",
      );
      return;
    }
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    console.error(
      `[map] Mapbox trả HTTP ${res.status}: ${body?.message ?? res.statusText} (style: ${MAPBOX_STYLE})`,
    );
  } catch {
    console.error(
      "[map] Không gọi được api.mapbox.com (mạng, tiện ích chặn quảng cáo hoặc CSP).",
    );
  }
}

const TILE_PROVIDERS: TileProvider[] = MAPBOX_PROVIDER
  ? [MAPBOX_PROVIDER, ...FREE_TILE_PROVIDERS]
  : FREE_TILE_PROVIDERS;

const TILE_ERRORS_BEFORE_FALLBACK = 3;

/** Tính lại kích thước khi khung chứa đổi size (layout grid, ẩn/hiện tab, ...). */
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => map.invalidateSize();
    const timer = setTimeout(refresh, 100);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(refresh)
        : null;
    observer?.observe(map.getContainer());

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

interface OSMMapProps {
  lat: number;
  lng: number;
  name?: string;
}

export default function OSMMap({ lat, lng, name }: OSMMapProps) {
  const [providerIndex, setProviderIndex] = useState(0);
  const errorCount = useRef(0);
  const provider = TILE_PROVIDERS[providerIndex];

  const handleTileError = useCallback(
    (event: L.TileErrorEvent) => {
      // Bỏ query string để không in access_token ra console.
      const src = event.tile?.src?.split("?")[0];
      console.warn(`[map] tile lỗi (${provider.id}):`, src);
      if (provider.id === "mapbox") void diagnoseMapbox();
      errorCount.current += 1;
      if (
        errorCount.current >= TILE_ERRORS_BEFORE_FALLBACK &&
        providerIndex < TILE_PROVIDERS.length - 1
      ) {
        errorCount.current = 0;
        setProviderIndex(providerIndex + 1);
      }
    },
    [provider.id, providerIndex],
  );

  // Chỉ đếm lỗi LIÊN TIẾP: một tile tải được là reset, để vài tile lỗi lác đác
  // (mạng chập chờn) không đẩy bản đồ khỏi Mapbox một cách oan uổng.
  const handleTileLoad = useCallback(() => {
    errorCount.current = 0;
  }, []);

  const eventHandlers = useMemo(
    () => ({ tileerror: handleTileError, tileload: handleTileLoad }),
    [handleTileError, handleTileLoad],
  );

  return (
    <div className="relative z-0 h-64 w-full overflow-hidden rounded-2xl border border-[#1F2937] shadow-lg">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <MapResizer />
        <TileLayer
          key={provider.id}
          attribution={provider.attribution}
          url={provider.url}
          maxZoom={provider.maxZoom}
          subdomains={provider.subdomains ?? "abc"}
          tileSize={provider.tileSize ?? 256}
          zoomOffset={provider.zoomOffset ?? 0}
          eventHandlers={eventHandlers}
        />
        <Marker position={[lat, lng]} icon={markerIcon}>
          {name && (
            <Popup>
              <div className="p-1 font-sans text-xs font-semibold text-gray-900">
                {name}
              </div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
