# Requirements Document

## Introduction

A mobile reading application built with React Native and Supabase that supports students in improving reading fluency. Students can read passages aloud, record their voice, receive text-to-speech playback, and track their progress — all with full offline support. Teachers can monitor student progress through a dedicated dashboard. Data is stored locally via SQLite and synced to Supabase when an internet connection is available.

## Glossary

- **App**: The React Native mobile reading application
- **Student**: A user with the "student" role who reads passages and records audio
- **Teacher**: A user with the "teacher" role who monitors student progress
- **Reading_Material**: A passage with a title, text content, and difficulty level
- **Progress_Record**: A record of a student's reading session including score, fluency, and speed
- **Recording**: An audio file captured during a student's reading session
- **Local_DB**: The on-device SQLite database used for offline storage
- **Sync_Service**: The service responsible for uploading local data to Supabase when online
- **Auth_Service**: The service responsible for user authentication via Supabase
- **TTS_Service**: The text-to-speech service that reads passages aloud
- **Recorder_Service**: The service that captures and stores audio recordings
- **Supabase**: The cloud backend providing PostgreSQL database, authentication, and file storage

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to register and log in with my email and password, so that my data is associated with my account.

#### Acceptance Criteria

1. WHEN a user submits a valid email and password on the registration screen, THE Auth_Service SHALL create a new account in Supabase and assign a role of "student" or "teacher"
2. WHEN a user submits valid credentials on the login screen, THE Auth_Service SHALL authenticate the user and return a session token
3. IF a user submits invalid credentials, THEN THE Auth_Service SHALL return a descriptive error message without exposing internal details
4. WHILE a user session is active, THE App SHALL maintain authentication state across app restarts using persisted storage
5. WHEN a user logs out, THE App SHALL clear the local session and navigate to the login screen

---

### Requirement 2: Reading Material Display

**User Story:** As a student, I want to view reading passages on my device, so that I can practice reading even without an internet connection.

#### Acceptance Criteria

1. THE App SHALL display a list of available Reading_Materials on the home screen
2. WHEN a student selects a Reading_Material, THE App SHALL display the full passage text on the reading screen
3. WHILE the device has no internet connection, THE App SHALL display Reading_Materials previously cached in the Local_DB
4. THE Reading_Material SHALL include a title, content body, and difficulty level indicator
5. WHEN new Reading_Materials are available on Supabase, THE Sync_Service SHALL download and cache them in the Local_DB upon successful connection

---

### Requirement 3: Text-to-Speech Playback

**User Story:** As a student, I want the app to read passages aloud, so that I can hear correct pronunciation before or during my own reading.

#### Acceptance Criteria

1. WHEN a student activates the TTS playback control on the reading screen, THE TTS_Service SHALL read the full passage text aloud using the device's speech engine
2. WHEN a student activates the stop control, THE TTS_Service SHALL stop speech playback immediately
3. THE TTS_Service SHALL support adjustable speech rate within the range of 0.5x to 2.0x normal speed
4. IF the device speech engine is unavailable, THEN THE TTS_Service SHALL display an error message informing the student that text-to-speech is not available on this device

---

### Requirement 4: Voice Recording

**User Story:** As a student, I want to record myself reading a passage, so that my teacher can review my fluency and I can track my improvement.

#### Acceptance Criteria

1. WHEN a student activates the record control on the reading screen, THE Recorder_Service SHALL begin capturing audio from the device microphone
2. WHEN a student activates the stop recording control, THE Recorder_Service SHALL stop audio capture and save the recording to local device storage
3. THE Recorder_Service SHALL save recordings in a compressed audio format (m4a or mp3) to minimize storage usage
4. IF microphone permission has not been granted, THEN THE App SHALL prompt the student to grant microphone permission before recording begins
5. IF microphone permission is denied, THEN THE App SHALL display an informative message explaining that recording requires microphone access
6. WHEN the device is online and a recording exists locally, THE Sync_Service SHALL upload the recording file to Supabase Storage and store the resulting file URL in the recordings table

---

### Requirement 5: Progress Tracking

**User Story:** As a student, I want to see my reading scores and history, so that I can monitor my own improvement over time.

#### Acceptance Criteria

1. WHEN a student completes a reading session, THE App SHALL save a Progress_Record containing score, fluency rating, and reading speed to the Local_DB
2. THE App SHALL display a list of past Progress_Records on the student's profile screen, ordered by most recent first
3. WHILE the device has no internet connection, THE App SHALL read and display Progress_Records from the Local_DB
4. WHEN the device is online, THE Sync_Service SHALL upload unsynced Progress_Records to Supabase and mark them as synced in the Local_DB
5. THE Progress_Record SHALL include the date of the session, the title of the Reading_Material, the score (0–100), fluency rating, and reading speed in words per minute

---

### Requirement 6: Teacher Monitoring Dashboard

**User Story:** As a teacher, I want to view the progress records of all my students, so that I can identify who needs additional support.

#### Acceptance Criteria

1. WHILE a user is authenticated with the "teacher" role, THE App SHALL display a student progress dashboard instead of the student home screen
2. THE App SHALL display a list of all students associated with the teacher's class on the dashboard
3. WHEN a teacher selects a student from the list, THE App SHALL display that student's Progress_Records including scores, fluency, speed, and session dates
4. WHEN a teacher selects a Progress_Record that has an associated recording, THE App SHALL provide a playback control to listen to the student's recording
5. IF a student has no Progress_Records, THEN THE App SHALL display a message indicating no activity has been recorded for that student

---

### Requirement 7: Offline Support

**User Story:** As a student, I want to use the app without an internet connection, so that I can practice reading anywhere.

#### Acceptance Criteria

1. WHILE the device has no internet connection, THE App SHALL allow students to access cached Reading_Materials, record audio, and save Progress_Records to the Local_DB
2. THE Local_DB SHALL persist all student data between app sessions regardless of network state
3. WHEN the device transitions from offline to online, THE Sync_Service SHALL automatically detect the change and begin uploading pending local data
4. THE App SHALL display a visible indicator when the device is operating in offline mode
5. IF a sync operation fails due to a network error, THEN THE Sync_Service SHALL retain the local data and retry the sync on the next available connection

---

### Requirement 8: Cloud Sync

**User Story:** As a user, I want my data automatically synced to the cloud, so that my progress is preserved if I change devices.

#### Acceptance Criteria

1. WHEN the device is online, THE Sync_Service SHALL sync all unsynced Progress_Records and Recordings to Supabase without requiring manual user action
2. THE Sync_Service SHALL mark each Progress_Record as synced in the Local_DB after a successful upload to prevent duplicate submissions
3. IF a duplicate record is detected during sync, THEN THE Sync_Service SHALL skip the duplicate and continue syncing remaining records
4. THE Sync_Service SHALL sync data in the background without blocking the student's ability to use the App
5. WHEN sync completes successfully, THE App SHALL update the offline indicator to reflect the online and synced state
