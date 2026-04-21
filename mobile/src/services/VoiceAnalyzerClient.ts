/**
 * VoiceAnalyzerClient
 *
 * Uploads a recorded audio file to the backend analysis endpoint and returns
 * a structured AnalysisResult. All network errors are caught and re-thrown
 * with descriptive messages — raw server errors are never surfaced to the UI.
 *
 * Requirements: 6.1, 6.4
 */

import axios from 'axios';
import { Platform } from 'react-native';
import { BASE_URL } from '../config/api';
import { AnalysisResult } from '../types';
import authService from './AuthService';

class VoiceAnalyzerClient {
  /**
   * Upload the audio file at `recordingUri` to POST /api/analysis and return
   * the structured AnalysisResult from the server.
   *
   * Throws a descriptive Error on any non-2xx response or network failure.
   */
  async analyze(recordingUri: string, materialId: string): Promise<AnalysisResult> {
    const token = await authService.getToken();

    let body: unknown;

    if (Platform.OS === 'web') {
      // Web: fetch the blob and send as FormData
      const res = await fetch(recordingUri);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('audio', blob, 'recording.m4a');
      formData.append('material_id', materialId);
      const response = await axios.post(`${BASE_URL}/analysis`, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'multipart/form-data',
        },
      });
      body = response.data;
    } else {
      const FileSystem = await import('expo-file-system');
      const uploadResult = await FileSystem.uploadAsync(
        `${BASE_URL}/analysis`,
        recordingUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'audio',
          parameters: { material_id: materialId },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        const status = uploadResult.status;
        if (status === 401) throw new Error('Authentication required. Please log in and try again.');
        if (status === 413) throw new Error('Recording file is too large. Please try a shorter recording.');
        if (status >= 500) throw new Error('The analysis service is temporarily unavailable. Please try again later.');
        throw new Error(`Voice analysis failed (status ${status}). Please try again.`);
      }

      try { body = JSON.parse(uploadResult.body); }
      catch { throw new Error('Received an unexpected response from the analysis service. Please try again.'); }
    }

    return body as AnalysisResult;
  }
}

export const voiceAnalyzerClient = new VoiceAnalyzerClient();
export default voiceAnalyzerClient;
