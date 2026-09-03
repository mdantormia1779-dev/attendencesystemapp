import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Vibration, Platform } from "react-native";

// High-clarity, pleasant bell chime
const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

let _audioPlayer: any = null;
let _isInitialized = false;

async function initPlayer() {
  if (_isInitialized) return _audioPlayer;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
    }).catch(() => null);

    _audioPlayer = createAudioPlayer(NOTIFICATION_SOUND_URL);
    _isInitialized = true;
    return _audioPlayer;
  } catch (e) {
    console.warn("Init audio player error:", e);
    return null;
  }
}

/**
 * Play a crystal-clear notification chime sound with haptic vibration feedback.
 */
export async function playNotificationSound() {
  try {
    // 1. Double pulse vibration
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 150, 80, 200]);
    }

    // 2. Play chime
    const player = await initPlayer();
    if (player) {
      player.seekTo(0);
      player.play();
    }
  } catch (err) {
    console.warn("Play notification sound error:", err);
    try {
      Vibration.vibrate(300);
    } catch {}
  }
}
