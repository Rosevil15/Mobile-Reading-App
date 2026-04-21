# Implementation Plan: Mobile Reading App

## Overview

Implement a React Native (Expo) offline-first reading app with role-based navigation, SQLite local storage, Supabase cloud sync, TTS playback, voice recording, and a teacher monitoring dashboard.

## Tasks

- [x] 1. Project setup and core types
  - Initialize Expo project with TypeScript template
  - Install dependencies: `expo-sqlite`, `expo-speech`, `expo-av`, `@supabase/supabase-js`, `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`, `fast-check`, `jest`
  - Create TypeScript types in `src/types/index.ts`: `Role`, `DifficultyLevel`, `ReadingMaterial`, `ProgressRecord`, `RecordingEntry`, `Session`, `SyncResult`, `SyncError`
  - _Requirements: 1.1, 2.4, 4.3, 5.5_

- [x] 2. Local SQLite database setup
  - [x] 2.1 Create `src/db/schema.ts` — initialize SQLite DB and run `CREATE TABLE IF NOT EXISTS` for `reading_materials`, `progress_records`, and `recordings`
    - _Requirements: 7.2_

  - [ ]* 2.2 Write property test for local DB persistence round-trip (Property 19)
    - **Property 19: Local DB persists data across sessions**
    - **Validates: Requirements 7.2**

- [x] 3. Repository layer
  - [x] 3.1 Implement `ReadingMaterialRepo` in `src/repositories/reading-material.repo.ts` with `getAll()` and `upsert()`
    - _Requirements: 2.1, 2.3, 2.5_

  - [ ]* 3.2 Write property tests for `ReadingMaterialRepo` (Properties 6, 7)
    - **Property 6: Reading material list completeness**
    - **Property 7: Reading material data integrity**
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [x] 3.3 Implement `ProgressRepo` in `src/repositories/progress.repo.ts` with `save()`, `getByStudent()`, `getUnsynced()`, `markSynced()`
    - Ensure `getByStudent()` returns records sorted descending by `sessionDate`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.4 Write property tests for `ProgressRepo` (Properties 12, 13, 14, 15)
    - **Property 12: Progress record persistence round-trip**
    - **Property 13: Progress records ordered by most recent first**
    - **Property 14: Progress record sync marks records as synced (idempotence)**
    - **Property 15: Progress record field completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 8.2**

  - [x] 3.5 Implement `RecordingRepo` in `src/repositories/recording.repo.ts` with `save()`, `getUnsynced()`, `markSynced(id, remoteUrl)`
    - _Requirements: 4.2, 4.6_

  - [ ]* 3.6 Write property tests for `RecordingRepo` (Property 11, 19)
    - **Property 11: Recording sync uploads and stores remote URL**
    - **Property 19: Local DB persists data across sessions**
    - **Validates: Requirements 4.6, 7.2**

- [x] 4. Checkpoint — Ensure all repository tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Auth Service
  - [x] 5.1 Implement `AuthService` in `src/services/auth.service.ts`
    - `register()`, `login()`, `logout()`, `getSession()`
    - Persist session to `AsyncStorage`; restore on `getSession()`
    - Sanitize Supabase error messages before surfacing them
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 5.2 Write property tests for `AuthService` (Properties 1–5)
    - **Property 1: Registration produces a valid session with the correct role**
    - **Property 2: Login round-trip**
    - **Property 3: Error messages do not leak internals**
    - **Property 4: Session persistence round-trip**
    - **Property 5: Logout clears session**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 6. TTS Service
  - [x] 6.1 Implement `TTSService` in `src/services/tts.service.ts`
    - `speak(text, rate)` — clamp rate to [0.5, 2.0] before calling Expo Speech
    - `stop()`, `isAvailable()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 6.2 Write property test for `TTSService` (Property 9)
    - **Property 9: TTS speech rate validation**
    - **Validates: Requirements 3.3**

- [x] 7. Recorder Service
  - [x] 7.1 Implement `RecorderService` in `src/services/recorder.service.ts`
    - `requestPermission()`, `startRecording()`, `stopRecording()` returning local file URI
    - Save recordings in `.m4a` format via Expo AV
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.2 Write property test for `RecorderService` (Property 10)
    - **Property 10: Recording stop produces a valid file**
    - **Validates: Requirements 4.2, 4.3**

- [x] 8. Sync Service
  - [x] 8.1 Implement `SyncService` in `src/services/sync.service.ts`
    - `sync()` — query unsynced recordings and progress records, upload to Supabase, mark synced
    - Skip duplicates (handle 409 responses) and retain local data on network error
    - _Requirements: 4.6, 5.4, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 8.2 Wire `SyncService` to `NetInfo` network state listener in `src/services/sync.listener.ts`
    - Trigger `sync()` automatically when transitioning from offline to online
    - _Requirements: 7.3, 8.1_

  - [ ]* 8.3 Write property tests for `SyncService` (Properties 8, 11, 14, 21)
    - **Property 8: Sync downloads new materials into local DB**
    - **Property 11: Recording sync uploads and stores remote URL**
    - **Property 14: Progress record sync marks records as synced (idempotence)**
    - **Property 21: Failed sync retains local data**
    - **Validates: Requirements 2.5, 4.6, 5.4, 7.5, 8.2**

- [x] 9. Checkpoint — Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Navigation and role-based routing
  - [x] 10.1 Create root navigator in `src/navigation/RootNavigator.tsx`
    - On app start, call `getSession()` and route to `StudentNavigator` or `TeacherNavigator` based on role; unauthenticated users go to `AuthNavigator`
    - _Requirements: 1.4, 6.1_

  - [ ]* 10.2 Write unit tests for role-based navigation routing
    - Test: teacher role → `TeacherNavigator`, student role → `StudentNavigator`, no session → `AuthNavigator`
    - _Requirements: 1.4, 6.1_

- [x] 11. Auth screens
  - [x] 11.1 Create `src/screens/auth/LoginScreen.tsx` and `RegisterScreen.tsx`
    - Wire to `AuthService.login()` and `AuthService.register()`
    - Display sanitized error messages on failure
    - On logout (from any screen), call `AuthService.logout()` and navigate to `LoginScreen`
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 12. Student screens
  - [x] 12.1 Create `src/screens/student/HomeScreen.tsx`
    - Fetch and display reading materials from `ReadingMaterialRepo.getAll()`
    - Show offline indicator when device has no connection (wire to `NetInfo`)
    - _Requirements: 2.1, 2.3, 7.1, 7.4_

  - [x] 12.2 Create `src/screens/student/ReadingScreen.tsx`
    - Display full passage text, difficulty level, and title
    - Integrate TTS controls (play/stop, rate slider 0.5–2.0x)
    - Integrate recording controls (start/stop); request mic permission before first record
    - On session complete, save `ProgressRecord` via `ProgressRepo.save()` and `RecordingEntry` via `RecordingRepo.save()`
    - _Requirements: 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.4, 4.5, 5.1_

  - [x] 12.3 Create `src/screens/student/ProfileScreen.tsx`
    - Display list of `ProgressRecord` items from `ProgressRepo.getByStudent()`, most recent first
    - Show empty state when no records exist
    - _Requirements: 5.2, 5.3, 5.5_

- [x] 13. Teacher screens
  - [x] 13.1 Create `src/screens/teacher/DashboardScreen.tsx`
    - Fetch and display list of students associated with the teacher from Supabase
    - Show empty state when no students are associated
    - _Requirements: 6.1, 6.2_

  - [x] 13.2 Create `src/screens/teacher/StudentDetailScreen.tsx`
    - Display selected student's `ProgressRecord` list including score, fluency, speed, and date
    - For records with a non-null `remoteUrl`, render a playback control (Expo AV)
    - Show empty state when student has no records
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 13.3 Write property and unit tests for teacher dashboard components (Properties 16, 17, 18)
    - **Property 16: Teacher dashboard shows all associated students**
    - **Property 17: Student detail shows correct progress records**
    - **Property 18: Recording playback control present when recording exists**
    - Unit test: empty student list shows empty state; empty progress list shows empty state
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [x] 14. Connectivity indicator component
  - [x] 14.1 Create `src/components/ConnectivityIndicator.tsx`
    - Subscribe to `NetInfo`; show "Offline" banner when disconnected, hide (or show "Synced") when online and sync completes
    - _Requirements: 7.4, 8.5_

  - [ ]* 14.2 Write property test for connectivity indicator (Property 20)
    - **Property 20: Connectivity indicator reflects network state**
    - **Validates: Requirements 7.4, 8.5**

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Wire everything together
  - [x] 16.1 Mount `SyncListener` at app root so sync triggers automatically on connectivity change
    - _Requirements: 7.3, 8.1, 8.4_

  - [x] 16.2 Ensure `ConnectivityIndicator` is rendered in all student and teacher screen layouts
    - _Requirements: 7.4, 8.5_

  - [ ]* 16.3 Write integration tests for end-to-end sync flow
    - Test: offline save → come online → sync triggers → records marked synced
    - _Requirements: 7.3, 8.1, 8.2, 8.4_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per run
- Each property test must include the comment: `// Feature: mobile-reading-app, Property N: <property_text>`
- Unit tests and property tests live under `__tests__/` alongside their source files
