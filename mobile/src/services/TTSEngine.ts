/**
 * TTSEngine — wraps expo-speech (native) or Web Speech API (web).
 * Word boundaries are simulated with timers.
 * Requirements: 4.1, 4.4, 4.5, 4.6
 */

import { Platform } from 'react-native';
import { TTSOptions } from '../types';

const BASE_WPM = 150;
const MIN_WORD_MS = 100;

type WordBoundaryCallback = (wordIndex: number) => void;
type CompleteCallback = () => void;

class TTSEngine {
  private words: string[] = [];
  private currentWordIndex = 0;
  private isPaused = false;
  private isSpeaking = false;
  private wordBoundaryCallbacks: WordBoundaryCallback[] = [];
  private completeCallbacks: CompleteCallback[] = [];
  private wordTimers: ReturnType<typeof setTimeout>[] = [];
  private speakStartTime = 0;
  private currentRate = 1.0;
  private elapsedBeforePause = 0;

  async speak(text: string, options: TTSOptions): Promise<void> {
    this.stop();
    this.words = text.trim().split(/\s+/).filter(Boolean);
    this.currentWordIndex = 0;
    this.isPaused = false;
    this.isSpeaking = true;
    this.currentRate = options.rate;
    this.elapsedBeforePause = 0;

    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate;
        utterance.lang = options.language;
        utterance.onend = () => this._handleComplete();
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => this._handleComplete(), 1000);
      }
    } else {
      const Speech = await import('expo-speech');
      Speech.speak(text, {
        rate: options.rate,
        language: options.language,
        onDone: () => this._handleComplete(),
        onStopped: () => { this.isSpeaking = false; },
        onError: () => { this.isSpeaking = false; },
      });
    }

    this.speakStartTime = Date.now();
    this._scheduleWordTimers(0, 0);
  }

  async pause(): Promise<void> {
    if (!this.isSpeaking || this.isPaused) return;
    this.isPaused = true;
    this.elapsedBeforePause += Date.now() - this.speakStartTime;
    this._clearWordTimers();
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) window.speechSynthesis.pause();
    } else {
      const Speech = await import('expo-speech');
      Speech.pause();
    }
  }

  async resume(): Promise<void> {
    if (!this.isSpeaking || !this.isPaused) return;
    this.isPaused = false;
    this.speakStartTime = Date.now();
    this._scheduleWordTimers(this.currentWordIndex, this.elapsedBeforePause);
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) window.speechSynthesis.resume();
    } else {
      const Speech = await import('expo-speech');
      Speech.resume();
    }
  }

  stop(): void {
    this._clearWordTimers();
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentWordIndex = 0;
    this.elapsedBeforePause = 0;
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } else {
      import('expo-speech').then(Speech => Speech.stop()).catch(() => {});
    }
  }

  onWordBoundary(callback: WordBoundaryCallback): void {
    this.wordBoundaryCallbacks.push(callback);
  }

  onComplete(callback: CompleteCallback): void {
    this.completeCallbacks.push(callback);
  }

  private _scheduleWordTimers(startIndex: number, elapsedMs: number): void {
    const msPerWord = Math.max(MIN_WORD_MS, (60_000 / BASE_WPM) / this.currentRate);
    for (let i = startIndex; i < this.words.length; i++) {
      const delay = (i - startIndex) * msPerWord - elapsedMs % msPerWord;
      const wordIndex = i;
      const timer = setTimeout(() => {
        if (!this.isPaused && this.isSpeaking) {
          this.currentWordIndex = wordIndex;
          this._emitWordBoundary(wordIndex);
        }
      }, Math.max(0, delay));
      this.wordTimers.push(timer);
    }
  }

  private _clearWordTimers(): void {
    for (const t of this.wordTimers) clearTimeout(t);
    this.wordTimers = [];
  }

  private _emitWordBoundary(index: number): void {
    for (const cb of this.wordBoundaryCallbacks) cb(index);
  }

  private _handleComplete(): void {
    this._clearWordTimers();
    this.isSpeaking = false;
    this.isPaused = false;
    for (const cb of this.completeCallbacks) cb();
  }
}

const ttsEngine = new TTSEngine();
export default ttsEngine;
export { TTSEngine };
