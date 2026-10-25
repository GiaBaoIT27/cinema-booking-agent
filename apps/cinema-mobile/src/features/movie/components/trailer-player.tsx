import { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { VideoView, useVideoPlayer } from "expo-video";
import { colors } from "@/theme/colors";
import type { TrailerSource } from "../utils/trailer";

function FilePlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.fill}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
}

function YouTubePlayer({ videoId }: { videoId: string }) {
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text style={styles.error}>
          Không phát được trailer này (video có thể bị chặn nhúng).
        </Text>
      </View>
    );
  }
  return (
    <YoutubePlayer
      height={Math.round((width * 9) / 16)}
      width={width}
      videoId={videoId}
      play
      onError={() => setFailed(true)}
      webViewProps={{ allowsInlineMediaPlayback: true }}
    />
  );
}

export function TrailerPlayer({ source }: { source: TrailerSource }) {
  return source.kind === "youtube" ? (
    <YouTubePlayer videoId={source.videoId} />
  ) : (
    <View style={styles.box}>
      <FilePlayer uri={source.uri} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  fill: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: colors.muted, textAlign: "center", fontSize: 14 },
});
