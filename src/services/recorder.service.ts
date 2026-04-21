import { Platform } from 'react-native'

/**
 * RecorderService wraps Expo AV to manage microphone permission,
 * recording lifecycle, and local file persistence.
 * On web, recording is not supported.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class RecorderService {
  private recording: any = null

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false
    const { Audio } = require('expo-av')
    const { status } = await Audio.requestPermissionsAsync()
    return status === 'granted'
  }

  async startRecording(): Promise<void> {
    if (Platform.OS === 'web') throw new Error('Recording is not supported on web.')
    const { Audio } = require('expo-av')
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )
    this.recording = recording
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) throw new Error('No active recording to stop')
    await this.recording.stopAndUnloadAsync()
    const uri = this.recording.getURI()
    this.recording = null
    if (!uri) throw new Error('Recording URI is unavailable after stopping')
    return uri
  }
}

export const recorderService = new RecorderService()
