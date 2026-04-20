# Implementation Plan: Mobile Reading App

## Overview

Incremental implementation of the mobile reading app across two codebases: a Laravel PHP backend and a React Native (Expo) mobile client. Tasks are ordered so each step builds on the previous, with integration and wiring at the end.

## Tasks

- [x] 1. Laravel backend — project setup and database
  - [x] 1.1 Scaffold Laravel project with Sanctum auth and configure MySQL connection
    - Install Laravel, `laravel/sanctum`, set up `.env` for MySQL
    - Run `php artisan migrate` baseline
    - _Requirements: 2.2, 8.3_
  - [x] 1.2 Create database migrations for `users`, `reading_materials`, and `progress_records`
    - Implement schema exactly as defined in the design (UUIDs, ENUMs, foreign keys)
    - _Requirements: 2.2, 3.1, 7.1, 8.1_
  - [x] 1.3 Seed bundled reading materials (at least one per level: beginner, intermediate, advanced)
    - _Requirements: 3.2_

- [x] 2. Laravel backend — authentication
  - [x] 2.1 Implement `POST /auth/login` endpoint
    - Validate credentials, return Sanctum token on success, return 401 with descriptive message on failure
    - _Requirements: 2.2, 2.3_
  - [ ]* 2.2 Write PHPUnit tests for login endpoint
    - Test valid credentials return token, invalid credentials return 401 with error message
    - _Requirements: 2.2, 2.3_
  - [ ]* 2.3 Write property test for Property 2 (valid login loads profile) and Property 3 (invalid credentials produce error)
    - **Property 2: Valid login loads profile**
    - **Property 3: Invalid credentials produce error**
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Laravel backend — reading materials API
  - [x] 3.1 Implement `GET /materials` endpoint (JWT-protected, returns list)
    - _Requirements: 3.1, 3.2_
  - [x] 3.2 Implement `GET /materials/:id/download` endpoint
    - Returns full material payload for offline storage
    - _Requirements: 3.4_
  - [ ]* 3.3 Write PHPUnit tests for materials endpoints
    - Test list returns only valid materials, download returns correct payload
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 4. Laravel backend — voice analysis service
  - [x] 4.1 Implement `POST /analysis` endpoint
    - Accept multipart audio upload + `material_id`, forward to Speech-to-Text service, return `AnalysisResult` JSON
    - Handle non-2xx from Speech-to-Text with descriptive error response
    - _Requirements: 6.1, 6.4_
  - [ ]* 4.2 Write PHPUnit tests for analysis endpoint
    - Test successful analysis returns all four metrics, test upstream failure returns descriptive error
    - _Requirements: 6.1, 6.4_
  - [ ]* 4.3 Write property test for Property 12 (analysis result completeness)
    - **Property 12: Analysis result completeness**
    - **Validates: Requirements 6.1**

- [x] 5. Laravel backend — progress sync and teacher dashboard
  - [x] 5.1 Implement `POST /progress` endpoint
    - Accept array of `ProgressRecord`s, persist to `progress_records` table, return success/failure per record
    - _Requirements: 7.3, 7.4_
  - [x] 5.2 Implement `GET /teacher/students` endpoint (Teacher/Admin JWT only)
    - Return list of students with synced records; reject non-teacher roles with 403
    - _Requirements: 8.1, 8.3_
  - [x] 5.3 Implement `GET /teacher/students/:id/progress` endpoint (Teacher/Admin JWT only)
    - Return all ProgressRecords for the given student
    - _Requirements: 8.2_
  - [ ]* 5.4 Write PHPUnit tests for progress and teacher endpoints
    - Test sync persists records, test teacher access control (student role → 403, teacher role → 200)
    - _Requirements: 7.3, 7.4, 8.1, 8.2, 8.3_
  - [ ]* 5.5 Write property test for Property 19 (teacher dashboard access control)
    - **Property 19: Teacher dashboard access control**
    - **Validates: Requirements 8.3**

- [x] 6. Checkpoint — backend complete
  - Ensure all PHPUnit tests pass. Verify all API endpoints respond correctly with a REST client. Ask the user if questions arise.

- [x] 7. Expo project setup and core infrastructure
  - [x] 7.1 Scaffold Expo (React Native) project with TypeScript template
    - Install dependencies: `expo-sqlite`, `expo-speech`, `expo-av`, `@react-native-community/netinfo`, `expo-file-system`, `axios`, `fast-check` (dev)
    - Set up Jest + React Native Testing Library
    - _Requirements: 1.1_
  - [x] 7.2 Implement `LocalStorageService` using `expo-sqlite`
    - Create SQLite schema for `reading_materials`, `progress_records`, `local_sessions`
    - Implement all methods: `saveProgressRecord`, `getProgressRecords`, `markSynced`, `getUnsynced`, `saveMaterial`, `getMaterials`, `saveSession`, `getSession`
    - _Requirements: 2.4, 3.2, 5.5, 7.1, 7.2_
  - [ ]* 7.3 Write unit tests for `LocalStorageService`
    - Test CRUD round-trips, `markSynced`, `getUnsynced` filtering
    - _Requirements: 7.1, 7.2_
  - [ ]* 7.4 Write property test for Property 4 (guest session persistence round-trip) and Property 10 (recording saved to LocalStorage) and Property 14 (ProgressRecord completeness) and Property 15 (ProgressRecord persistence across restarts)
    - **Property 4: Guest session persistence round-trip**
    - **Property 10: Recording saved to LocalStorage**
    - **Property 14: ProgressRecord completeness**
    - **Property 15: ProgressRecord persistence across restarts**
    - **Validates: Requirements 2.4, 5.5, 7.1, 7.2**

- [x] 8. Network monitor and connectivity routing
  - [x] 8.1 Implement `NetworkMonitor` using `@react-native-community/netinfo`
    - Expose `isOnline` state and `onConnectivityChange` callback
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 8.2 Implement app launch connectivity check and mode routing
    - On launch: check connectivity → set online/offline mode → load from LocalStorage regardless
    - Show full-screen message when LocalStorage is empty and offline (Requirement 1.4)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 8.3 Write property test for Property 1 (connectivity mode routing)
    - **Property 1: Connectivity mode routing**
    - **Validates: Requirements 1.2, 1.3**

- [x] 9. Authentication screens and session management
  - [x] 9.1 Implement login screen UI with email/password fields and "Continue as Guest" option
    - _Requirements: 2.1_
  - [x] 9.2 Implement `AuthService` — calls `POST /auth/login`, stores token, loads profile
    - On success: persist session token; on failure: display descriptive error message
    - _Requirements: 2.2, 2.3_
  - [x] 9.3 Implement guest session creation — generate local UUID, save `LocalSession` via `LocalStorageService`
    - _Requirements: 2.4, 2.5_
  - [ ]* 9.4 Write unit tests for `AuthService`
    - Test valid login stores token, invalid login shows error, guest session is saved to LocalStorage
    - _Requirements: 2.2, 2.3, 2.4_

- [x] 10. Reading material list screen
  - [x] 10.1 Implement `MaterialListScreen` — fetches from `LocalStorageService.getMaterials()`, displays list with previous scores
    - Filter: only bundled or downloaded materials shown
    - Show previous best score per material (from `ProgressRecord`s)
    - _Requirements: 3.1, 3.2, 9.3_
  - [x] 10.2 Implement "Download" action for online mode — calls `GET /materials/:id/download`, saves via `LocalStorageService.saveMaterial()`
    - _Requirements: 3.4_
  - [x] 10.3 Wire material selection to navigate to `ReadingSessionScreen` with selected material
    - _Requirements: 3.3_
  - [ ]* 10.4 Write property test for Property 5 (material list filtering invariant) and Property 6 (material selection navigates to session)
    - **Property 5: Material list filtering invariant**
    - **Property 6: Material selection navigates to session**
    - **Validates: Requirements 3.2, 3.3**

- [x] 11. TTS engine and reading session
  - [x] 11.1 Implement `TTSEngine` wrapping `expo-speech`
    - Implement `speak`, `pause`, `resume`, `stop`, `onWordBoundary`, `onComplete`
    - Derive `rate` from `ReadingMaterial.defaultTTSRate`
    - _Requirements: 4.1, 4.4, 4.5, 4.6_
  - [x] 11.2 Implement `ReadingSessionScreen` with passage display and word highlight
    - Highlight current word/sentence on `onWordBoundary` events
    - Show Start, Pause, Resume controls
    - On TTS complete: stop highlighting, show "Record My Reading" button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 11.3 Write property test for Property 7 (TTS rate matches reading level) and Property 8 (word highlight tracks TTS position) and Property 9 (TTS pause-resume round-trip)
    - **Property 7: TTS rate matches reading level**
    - **Property 8: Word highlight tracks TTS position**
    - **Property 9: TTS pause-resume round-trip**
    - **Validates: Requirements 4.2, 4.4, 4.5, 4.6**

- [x] 12. Voice recorder
  - [x] 12.1 Implement `RecorderService` wrapping `expo-av`
    - Implement `requestPermission`, `startRecording`, `stopRecording`
    - Enforce minimum 16000 Hz sample rate in recording options
    - On stop: save audio file via `expo-file-system`, return `RecordingResult` with URI
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_
  - [x] 12.2 Implement recording UI in `ReadingSessionScreen`
    - "Record My Reading" button → request permission → start recording with visual indicator
    - "Stop Recording" button → stop and save
    - Show modal with deep-link to settings if permission denied
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 12.3 Write property test for Property 10 (recording saved to LocalStorage) and Property 11 (recording sample rate invariant)
    - **Property 10: Recording saved to LocalStorage**
    - **Property 11: Recording sample rate >= 16000 Hz**
    - **Validates: Requirements 5.5, 5.6**

- [x] 13. Voice analysis and feedback
  - [x] 13.1 Implement `VoiceAnalyzerClient` — uploads audio to `POST /analysis`, returns `AnalysisResult`
    - Handle non-2xx: surface descriptive error, do not throw raw error to UI
    - _Requirements: 6.1, 6.4_
  - [x] 13.2 Implement `FeedbackEngine.generate()` — pure function converting `AnalysisResult` to `FeedbackReport`
    - Always produce at least one suggestion
    - _Requirements: 6.2, 6.5_
  - [x] 13.3 Implement `FeedbackScreen` — display mispronounced words, pace, accuracy score, suggestions
    - Show "Try Again" button that re-submits existing recording on analysis failure
    - _Requirements: 6.3, 6.4_
  - [ ]* 13.4 Write unit tests for `FeedbackEngine`
    - Test with zero mispronunciations, test suggestion guarantee, test all report fields present
    - _Requirements: 6.2, 6.5_
  - [ ]* 13.5 Write property test for Property 13 (feedback report completeness and suggestion guarantee)
    - **Property 13: Feedback report completeness and suggestion guarantee**
    - **Validates: Requirements 6.2, 6.5**

- [x] 14. Progress saving
  - [x] 14.1 After feedback is generated, save `ProgressRecord` to `LocalStorageService`
    - Compose record from session score, recording URI, feedback summary, timestamp
    - Ensure new records for repeated materials are appended, not overwritten
    - _Requirements: 7.1, 9.1, 9.2_
  - [ ]* 14.2 Write property test for Property 14 (ProgressRecord completeness) and Property 21 (repeat session creates new record)
    - **Property 14: ProgressRecord completeness**
    - **Property 21: Repeat session creates new record**
    - **Validates: Requirements 7.1, 9.1, 9.2**

- [x] 15. Checkpoint — core mobile flow complete
  - Ensure all Jest tests pass. Verify offline flow end-to-end: launch → select material → TTS → record → feedback → progress saved. Ask the user if questions arise.

- [x] 16. SyncService
  - [x] 16.1 Implement `SyncService`
    - On `start()`: subscribe to `NetworkMonitor.onConnectivityChange` and app foreground events
    - `syncNow()`: fetch unsynced records via `LocalStorageService.getUnsynced()`, POST to `/progress`, call `markSynced()` on success
    - Retain failed records in LocalStorage; implement exponential backoff (1s, 2s, 4s, max 30s)
    - _Requirements: 7.3, 7.4, 7.5_
  - [ ]* 16.2 Write unit tests for `SyncService` retry logic
    - Mock network failures, verify records are retained and retried
    - _Requirements: 7.5_
  - [ ]* 16.3 Write property test for Property 16 (sync round-trip) and Property 17 (sync retry on failure)
    - **Property 16: Sync round-trip**
    - **Property 17: Sync retry on failure**
    - **Validates: Requirements 7.3, 7.4, 7.5**

- [x] 17. Teacher dashboard (mobile view)
  - [x] 17.1 Implement `TeacherDashboardScreen` — visible only to users with `teacher` or `admin` role
    - Fetch `GET /teacher/students`, display student list
    - On student select: fetch `GET /teacher/students/:id/progress`, display records with scores, feedback summaries, timestamps
    - Handle 403 with "Access denied" message (no role details exposed)
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 17.2 Implement real-time or polling refresh so newly synced records appear without manual refresh
    - Poll `/teacher/students/:id/progress` on a short interval when dashboard is active, or use server-sent events if supported
    - _Requirements: 8.4_
  - [ ]* 17.3 Write property test for Property 18 (teacher dashboard shows student records) and Property 20 (dashboard reflects new syncs)
    - **Property 18: Teacher dashboard shows student records**
    - **Property 20: Dashboard reflects new syncs without manual refresh**
    - **Validates: Requirements 8.2, 8.4**

- [x] 18. Wire everything together
  - [x] 18.1 Set up React Navigation stack: Login → MaterialList → ReadingSession → Feedback → (TeacherDashboard for teachers)
    - Guard teacher route — redirect non-teacher users
    - _Requirements: 2.1, 3.3, 8.3_
  - [x] 18.2 Start `SyncService` on app launch after session is established; stop on logout
    - _Requirements: 7.3_
  - [x] 18.3 Wire `NetworkMonitor` to UI — show online/offline banner throughout the app
    - _Requirements: 1.2, 1.3_
  - [x] 18.4 Ensure bundled materials are seeded into `LocalStorageService` on first launch
    - _Requirements: 3.2_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Run full Jest suite and PHPUnit suite. Ensure all tests pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations; each test must include the comment `// Feature: mobile-reading-app, Property N: <property_text>`
- Unit tests use Jest + React Native Testing Library (mobile) and PHPUnit (backend)
- Mock `expo-speech`, `expo-av`, `NetInfo`, and `expo-sqlite` in all unit/property test environments
