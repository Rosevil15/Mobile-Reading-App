import axios from 'axios';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { BASE_URL } from '../config/api';
import { LocalSession } from '../types';
import localStorageService from './LocalStorageService';

export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

export interface LoginResult {
  token: string;
  user: UserProfile;
}

// ─── Storage helpers (web uses localStorage, native uses expo-file-system) ───

async function writeFile(name: string, value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(name, value);
  } else {
    const FS = await import('expo-file-system');
    await FS.writeAsStringAsync(`${FS.documentDirectory}${name}`, value);
  }
}

async function readFile(name: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(name);
  }
  try {
    const FS = await import('expo-file-system');
    const path = `${FS.documentDirectory}${name}`;
    const info = await FS.getInfoAsync(path);
    if (!info.exists) return null;
    return (await FS.readAsStringAsync(path)) || null;
  } catch { return null; }
}

async function deleteFile(name: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(name);
  } else {
    try {
      const FS = await import('expo-file-system');
      await FS.deleteAsync(`${FS.documentDirectory}${name}`, { idempotent: true });
    } catch {}
  }
}

// ─── AuthService ─────────────────────────────────────────────────────────────

class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    const response = await axios.post<{ token: string; user: UserProfile }>(
      `${BASE_URL}/auth/login`,
      { email, password }
    );
    const { token, user } = response.data;
    await writeFile('auth_token', token);
    await writeFile('auth_role', user.role);
    return { token, user };
  }

  async logout(): Promise<void> {
    const token = await this.getToken();
    if (token) {
      try {
        await axios.post(`${BASE_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    await deleteFile('auth_token');
    await deleteFile('auth_role');
  }

  async getToken(): Promise<string | null> {
    return readFile('auth_token');
  }

  async getUserRole(): Promise<'student' | 'teacher' | 'admin' | null> {
    const role = await readFile('auth_role');
    if (role === 'student' || role === 'teacher' || role === 'admin') return role;
    return null;
  }

  async createGuestSession(): Promise<LocalSession> {
    const session: LocalSession = {
      id: uuidv4(),
      userId: uuidv4(),
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await localStorageService.saveSession(session);
    } catch {}
    return session;
  }
}

export const authService = new AuthService();
export default authService;
