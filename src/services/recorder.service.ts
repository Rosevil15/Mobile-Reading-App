import { Audio } from 'expo-av'

/**
 * RecorderService wraps Expo AV to manage microphone permission,
 * recording lifecycle, and local file persistence.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class RecorderService {
  private recording: Audio.Recording | null = null

  /**
   * Request microphone permission from the device.
   * Returns true if permission is granted, false otherwise.
   * Requirements: 4.4, 4.5
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync()
    return status === 'granted'
  }

  /**
   * Begin capturing audio from the device microphone.
   * Uses high-quality .m4a format to minimize storage usage.
   * Requirements: 4.1, 4.3
   */
  async startRecording(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )

    this.recording = recording
  }

  /**
   * Stop audio capture, save the recording in .m4a format,
   * and return the local file URI.
   * Throws if recording was never started.
   * Requirements: 4.2, 4.3
   */
  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('No active recording to stop')
    }

    await this.recording.stopAndUnloadAsync()

    const uri = this.recording.getURI()
    this.recording = null

    if (!uri) {
      throw new Error('Recording URI is unavailable after stopping')
    }

    return uri
  }
}

export const recorderService = new RecorderService()
