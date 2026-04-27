import { Platform } from 'react-native'

/**
 * RecorderService wraps Expo AV for native and MediaRecorder API for web.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class RecorderService {
  private recording: any = null
  // Web MediaRecorder
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private webUri: string | null = null

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(t => t.stop()) // just check permission
        return true
      } catch {
        return false
      }
    }
    const { Audio } = require('expo-av')
    const { status } = await Audio.requestPermissionsAsync()
    return status === 'granted'
  }

  async startRecording(): Promise<void> {
    if (Platform.OS === 'web') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioChunks = []
      this.webUri = null
      this.mediaRecorder = new MediaRecorder(stream)
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data)
      }
      this.mediaRecorder.start()
      return
    }
    const { Audio } = require('expo-av')
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
    this.recording = recording
  }

  async stopRecording(): Promise<string> {
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
        if (!this.mediaRecorder) { reject(new Error('No active recording')); return }
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' })
          const url = URL.createObjectURL(blob)
          this.webUri = url
          this.mediaRecorder?.stream.getTracks().forEach(t => t.stop())
          this.mediaRecorder = null
          resolve(url)
        }
        this.mediaRecorder.stop()
      })
    }
    if (!this.recording) throw new Error('No active recording to stop')
    await this.recording.stopAndUnloadAsync()
    const uri = this.recording.getURI()
    this.recording = null
    if (!uri) throw new Error('Recording URI is unavailable after stopping')
    return uri
  }
}

export const recorderService = new RecorderService()
