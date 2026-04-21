/**
 * RecorderService — wraps expo-av Audio.Recording API (native only).
 * On web, recording is not supported — methods return stubs.
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6
 */

import { Platform } from 'react-native';
import { PermissionStatus, RecordingResult } from '../types';

const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: 2,
    audioEncoder: 3,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 'aac',
    audioQuality: 127,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

class RecorderService {
  private recording: any = null;

  async requestPermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') return 'granted';
    const { Audio } = await import('expo-av');
    const { status } = await Audio.requestPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  }

  async startRecording(): Promise<void> {
    if (Platform.OS === 'web') return;
    if (this.recording) await this.stopRecording().catch(() => {});
    const { Audio } = await import('expo-av');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(RECORDING_OPTIONS);
    await rec.startAsync();
    this.recording = rec;
  }

  async stopRecording(): Promise<RecordingResult> {
    if (Platform.OS === 'web') {
      return { uri: '', durationMs: 0, sampleRate: 16000 };
    }
    if (!this.recording) throw new Error('No active recording to stop');
    const rec = this.recording;
    this.recording = null;
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI() ?? '';
    const status = await rec.getStatusAsync();
    const durationMs = (status as any).durationMillis ?? 0;
    return { uri, durationMs, sampleRate: 16000 };
  }
}

const recorderService = new RecorderService();
export default recorderService;
export { RecorderService };
