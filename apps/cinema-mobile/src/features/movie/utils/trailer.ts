/** Lấy videoId nếu là link YouTube (watch?v=, youtu.be, embed, shorts, live). */
export function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,})/);
      return m ? m[1] : null;
    }
  } catch {
    // URL không hợp lệ
  }
  return null;
}

export type TrailerSource =
  | { kind: "youtube"; videoId: string }
  | { kind: "file"; uri: string };

/** YouTube thì nhúng iframe; còn lại coi là file video trực tiếp (mp4, m3u8). */
export function resolveTrailer(
  url: string | null | undefined,
): TrailerSource | null {
  if (!url || !url.trim()) return null;
  const id = getYouTubeId(url);
  if (id) return { kind: "youtube", videoId: id };
  if (/^https?:\/\//i.test(url.trim()))
    return { kind: "file", uri: url.trim() };
  return null;
}
