import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import authService from '../services/AuthService';

const POLL_INTERVAL_MS = 10_000;

interface Student {
  id: string;
  email: string;
}

interface ProgressRecord {
  id: string;
  sessionScore: number;
  feedbackSummary: string;
  completedAt: string;
}

interface Props {
  navigation?: { navigate: (screen: string) => void };
}

export default function TeacherDashboardScreen({ navigation: _navigation }: Props) {
  const [accessDenied, setAccessDenied] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check role on mount — Requirement 8.3
  useEffect(() => {
    authService.getUserRole().then((role) => {
      if (role !== 'teacher' && role !== 'admin') {
        setAccessDenied(true);
      }
      setRoleChecked(true);
    });
  }, []);

  // Fetch student list on mount — Requirement 8.1
  useEffect(() => {
    if (!roleChecked || accessDenied) return;

    async function fetchStudents() {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const token = await authService.getToken();
        const response = await axios.get<Student[]>(`${BASE_URL}/teacher/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(response.data);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setStudentsError('Failed to load students. Please try again.');
        }
      } finally {
        setStudentsLoading(false);
      }
    }

    fetchStudents();
  }, [roleChecked, accessDenied]);

  // Fetch progress for selected student — Requirement 8.2
  const fetchProgress = useCallback(async (studentId: string) => {
    setProgressError(null);
    try {
      const token = await authService.getToken();
      const response = await axios.get<ProgressRecord[]>(
        `${BASE_URL}/teacher/students/${studentId}/progress`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProgress(response.data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setProgressError('Failed to load progress. Please try again.');
      }
    }
  }, []);

  // Start/stop polling when a student is selected — Requirement 8.4
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (!selectedStudent) {
      setProgress([]);
      return;
    }

    setProgressLoading(true);
    fetchProgress(selectedStudent.id).finally(() => setProgressLoading(false));

    pollRef.current = setInterval(() => {
      fetchProgress(selectedStudent.id);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedStudent, fetchProgress]);

  // Clear poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  if (!roleChecked) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" testID="role-loading" />
      </View>
    );
  }

  if (accessDenied) {
    return (
      <View style={styles.centered}>
        <Text style={styles.accessDenied} testID="access-denied-message">
          Access denied
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Teacher Dashboard</Text>

      {selectedStudent ? (
        <View style={styles.flex}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedStudent(null)}
            testID="back-button"
          >
            <Text style={styles.backButtonText}>← Back to Students</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            Progress for {selectedStudent.email}
          </Text>

          {progressLoading ? (
            <ActivityIndicator size="large" color="#4A90E2" testID="progress-loading" />
          ) : progressError ? (
            <Text style={styles.error} testID="progress-error">{progressError}</Text>
          ) : progress.length === 0 ? (
            <Text style={styles.empty} testID="no-progress">No progress records found.</Text>
          ) : (
            <FlatList
              data={progress}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.recordCard} testID={`progress-record-${item.id}`}>
                  <Text style={styles.recordScore}>Score: {item.sessionScore}</Text>
                  <Text style={styles.recordFeedback}>{item.feedbackSummary}</Text>
                  <Text style={styles.recordTimestamp}>
                    {new Date(item.completedAt).toLocaleString()}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      ) : (
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>Students</Text>

          {studentsLoading ? (
            <ActivityIndicator size="large" color="#4A90E2" testID="students-loading" />
          ) : studentsError ? (
            <Text style={styles.error} testID="students-error">{studentsError}</Text>
          ) : students.length === 0 ? (
            <Text style={styles.empty} testID="no-students">No students found.</Text>
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.studentRow}
                  onPress={() => setSelectedStudent(item)}
                  testID={`student-row-${item.id}`}
                >
                  <Text style={styles.studentEmail}>{item.email}</Text>
                  <Text style={styles.studentId}>{item.id}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 8,
    color: '#444',
  },
  accessDenied: {
    fontSize: 18,
    color: '#e53e3e',
    fontWeight: '600',
  },
  error: {
    color: '#e53e3e',
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  empty: {
    color: '#999',
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  studentRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  studentEmail: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  studentId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  recordCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#eee',
  },
  recordScore: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  recordFeedback: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  recordTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#4A90E2',
    fontSize: 15,
  },
});
