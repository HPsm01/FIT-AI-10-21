import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { UserContext } from './UserContext';
import { gymTheme, gymStyles } from '../styles/theme';

const exerciseTypes = [
  { label: 'Deadlift', value: 'deadlift', id: 1, icon: '🏋️' },
  { label: 'Squat', value: 'squat', id: 2, icon: '🦵' },
  { label: 'Bench Press', value: 'bench_press', id: 3, icon: '💪' },
];

const generateSets = () => Array.from({ length: 5 }, (_, i) => ({
  set: i + 1,
  weight: '',
  reps: '',
  feedbackVideo: null,
  memo: '',
}));

export default function MyExerciseScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [exerciseSets, setExerciseSets] = useState({
    deadlift: generateSets(),
    squat: generateSets(),
    bench_press: generateSets(),
  });
  const [feedbackReadyArr, setFeedbackReadyArr] = useState(Array(generateSets().length).fill(false));
  const [feedbackReceivedArr, setFeedbackReceivedArr] = useState(Array(generateSets().length).fill(false));
  const [latestFeedbackList, setLatestFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const today = new Date();
  const formatDate = (date) => `${date.getFullYear().toString().slice(2)}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;

  const handleExerciseChange = (itemValue) => {
    setSelectedExercise(itemValue);
  };

  const handleSetChange = (idx, field, value) => {
    setExerciseSets(prev => ({
      ...prev,
      [selectedExercise]: prev[selectedExercise].map((s, i) =>
        i === idx ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleAddSet = () => {
    setExerciseSets(prev => ({
      ...prev,
      [selectedExercise]: [
        ...prev[selectedExercise],
        { set: prev[selectedExercise].length + 1, weight: '', reps: '', feedbackVideo: null, memo: '' }
      ]
    }));
  };

  // ✅ 개선된 피드백 불러오기 함수
  const fetchFeedback = async () => {
    if (!user?.id) return;
    
    setLoadingFeedback(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`http://13.209.67.129:8000/workouts/users/${user.id}/today?exercise=${selectedExercise}`);
      
      if (!res.ok) {
        console.log('피드백 불러오기 실패:', res.status);
        return;
      }
      
      const feedbackList = await res.json();
      console.log('받은 피드백 데이터:', feedbackList);
      
      setExerciseSets(prev => ({
        ...prev,
        [selectedExercise]: prev[selectedExercise].map((set, idx) => {
          const fb = feedbackList[idx]?.feedback;
          let memo = '피드백 없음';
          let hasFeedback = false;
          
          if (fb) {
            if (fb.depth) {
              memo = fb.depth;
              hasFeedback = true;
            }
            if (fb.score) {
              memo += ` (점수: ${fb.score})`;
            }
            if (fb.counts) {
              const countText = Object.entries(fb.counts)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => `${type}: ${count}회`)
                .join(', ');
              if (countText) {
                memo += ` [${countText}]`;
              }
            }
          }
          
          return {
            ...set,
            memo,
            hasFeedback,
          };
        }),
      }));
      
      // ✅ 피드백 상태 업데이트
      setFeedbackReceivedArr(prev => 
        prev.map((_, idx) => !!feedbackList[idx]?.feedback)
      );
      
      setLatestFeedbackList(feedbackList);
      
    } catch (e) {
      console.log('피드백 불러오기 실패:', e);
      Alert.alert('오류', '피드백을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  // ✅ 개선된 실시간 피드백 체크 함수
  const checkLatestFeedback = async () => {
    if (!user?.id) return;
    
    try {
      const res = await fetch(
        `http://13.209.67.129:8000/workouts/user?user_id=${user.id}&exercise=${selectedExercise}`
      );
      
      if (!res.ok) return;
      
      const feedbackList = await res.json();
      console.log('실시간 피드백 체크:', feedbackList);
      
      setLatestFeedbackList(feedbackList);
      
      // ✅ 피드백 준비 상태 업데이트
      setFeedbackReadyArr(prev => 
        prev.map((_, idx) => {
          const hasNewFeedback = !!feedbackList[idx]?.feedback;
          const wasReceived = feedbackReceivedArr[idx];
          return hasNewFeedback && !wasReceived;
        })
      );
      
    } catch (e) {
      console.log("실시간 피드백 체크 실패:", e);
    }
  };

  // ✅ 개별 세트 피드백 받기 함수
  const handleGetFeedback = async (setIndex) => {
    if (!user?.id) return;
    
    setLoadingFeedback(true);
    try {
      await fetchFeedback();
      
      // 해당 세트의 피드백 상태를 완료로 변경
      setFeedbackReceivedArr(prev => 
        prev.map((received, idx) => 
          idx === setIndex ? true : received
        )
      );
      
      Alert.alert('성공', '피드백을 받았습니다!');
      
    } catch (e) {
      console.log('피드백 받기 실패:', e);
      Alert.alert('오류', '피드백을 받는 중 오류가 발생했습니다.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [user?.id, selectedExercise]);

  useEffect(() => {
    setFeedbackReadyArr(Array(exerciseSets[selectedExercise].length).fill(false));
    setFeedbackReceivedArr(Array(exerciseSets[selectedExercise].length).fill(false));
  }, [selectedExercise, exerciseSets[selectedExercise].length]);

  // ✅ 개선된 실시간 체크 (5초마다)
  useEffect(() => {
    const interval = setInterval(checkLatestFeedback, 5000);
    return () => clearInterval(interval);
  }, [user?.id, selectedExercise, exerciseSets[selectedExercise].length]);

  const sets = exerciseSets[selectedExercise];
  const selectedExerciseInfo = exerciseTypes.find(e => e.value === selectedExercise);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDate(today)}</Text>
        <Text style={styles.headerTitle}>운동 기록</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 운동 선택 카드 */}
        <View style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseIcon}>{selectedExerciseInfo.icon}</Text>
            <Text style={styles.exerciseName}>{selectedExerciseInfo.label}</Text>
          </View>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedExercise}
              style={styles.picker}
              onValueChange={handleExerciseChange}
              itemStyle={{ color: gymTheme.colors.text }}
            >
              {exerciseTypes.map((ex) => (
                <Picker.Item 
                  key={ex.value} 
                  label={`${ex.icon} ${ex.label}`} 
                  value={ex.value}
                  color={gymTheme.colors.text}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* 세트 목록 */}
        <View style={styles.setsContainer}>
          <View style={styles.setsHeader}>
            <Text style={styles.setsTitle}>오늘의 세트</Text>
            <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
              <Text style={styles.addSetText}>+ 세트 추가</Text>
            </TouchableOpacity>
          </View>

          {sets.map((set, idx) => (
            <View key={idx} style={styles.setCard}>
              <View style={styles.setHeader}>
                <Text style={styles.setNumber}>{set.set}세트</Text>
                <View style={styles.weightContainer}>
                  <TextInput
                    style={[
                      styles.weightInput,
                      !set.weight || set.weight.trim() === '' ? styles.weightInputRequired : null
                    ]}
                    value={set.weight?.toString() ?? ''}
                    onChangeText={text => handleSetChange(idx, 'weight', text.replace(/[^0-9]/g, '').slice(0,3))}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholder="무게"
                    placeholderTextColor={gymTheme.colors.textMuted}
                  />
                  <Text style={styles.weightUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.setContent}>
                <View style={styles.memoContainer}>
                  <Text style={styles.memoLabel}>피드백:</Text>
                  <Text style={[
                    styles.memoText,
                    set.hasFeedback ? styles.memoTextWithFeedback : null
                  ]}>
                    {set.memo ? set.memo : '피드백 없음'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    !set.weight || set.weight.trim() === '' ? styles.uploadButtonDisabled : null
                  ]}
                  onPress={() => {
                    console.log('업로드 시 중량:', set.weight);
                    const weightVal = set.weight ? set.weight : '0';
                    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
                    const filename = `${user.id}_${user.username || user.name}_${weightVal}_${timestamp}.mp4`;
                    navigation.navigate('ExercisePaper', { s3KeyName: filename });
                  }}
                  disabled={!set.weight || set.weight.trim() === ''}
                >
                  <View style={[
                    styles.uploadContainer,
                    set.weight && set.weight.trim() !== '' ? styles.uploadActive : styles.uploadInactive
                  ]}>
                    <Text style={styles.uploadIcon}>📹</Text>
                    <Text style={styles.uploadText}>영상 업로드</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* ✅ 개선된 피드백 상태 */}
              <View style={styles.feedbackStatus}>
                {feedbackReceivedArr[idx] ? (
                  <View style={styles.feedbackReceived}>
                    <Text style={styles.feedbackReceivedText}>✅ 피드백 완료</Text>
                  </View>
                ) : feedbackReadyArr[idx] ? (
                  <TouchableOpacity 
                    style={styles.feedbackReadyButton} 
                    onPress={() => handleGetFeedback(idx)}
                    disabled={loadingFeedback}
                  >
                    <Text style={styles.feedbackReadyText}>
                      {loadingFeedback ? '⏳ 처리 중...' : '📊 피드백 받기'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.feedbackWaitingText}>⏳ 피드백 대기 중</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ✅ 개선된 피드백 새로고침 버튼 */}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchFeedback}
          disabled={loadingFeedback}
        >
          <View style={styles.refreshContainer}>
            <Text style={styles.refreshText}>
              {loadingFeedback ? '⏳ 새로고침 중...' : '🔄 피드백 새로고침'}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  header: {
    backgroundColor: gymTheme.colors.secondary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: gymTheme.spacing.lg,
    alignItems: 'center',
  },
  
  dateText: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginBottom: 4,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  scrollView: {
    flex: 1,
  },
  
  content: {
    padding: gymTheme.spacing.lg,
  },
  
  exerciseCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  
  exerciseIcon: {
    fontSize: 24,
    marginRight: gymTheme.spacing.sm,
  },
  
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  pickerContainer: {
    backgroundColor: gymTheme.colors.input,
    borderRadius: gymTheme.borderRadius.medium,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
  },
  
  picker: {
    color: gymTheme.colors.text,
  },
  
  setsContainer: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  
  setsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  addSetButton: {
    backgroundColor: gymTheme.colors.accent,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.medium,
  },
  
  addSetText: {
    color: gymTheme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  
  setCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.md,
    ...gymTheme.shadows.medium,
  },
  
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  
  setNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
  },
  
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  weightInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    borderRadius: gymTheme.borderRadius.small,
    textAlign: 'center',
    marginRight: 8,
    backgroundColor: gymTheme.colors.input,
    color: gymTheme.colors.text,
    fontSize: 16,
  },
  
  weightInputRequired: {
    borderColor: gymTheme.colors.error,
    borderWidth: 2,
  },
  
  weightUnit: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  setContent: {
    marginBottom: gymTheme.spacing.md,
  },
  
  memoContainer: {
    marginBottom: gymTheme.spacing.md,
  },
  
  memoLabel: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginBottom: 4,
  },
  
  memoText: {
    fontSize: 14,
    color: gymTheme.colors.text,
    backgroundColor: gymTheme.colors.input,
    padding: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.small,
    minHeight: 40,
  },
  
  memoTextWithFeedback: {
    backgroundColor: gymTheme.colors.success,
    color: gymTheme.colors.text,
    fontWeight: '600',
  },
  
  uploadButton: {
    borderRadius: gymTheme.borderRadius.medium,
    overflow: 'hidden',
  },
  
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  
  uploadContainer: {
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: gymTheme.borderRadius.medium,
  },
  
  uploadActive: {
    backgroundColor: gymTheme.colors.accent,
  },
  
  uploadInactive: {
    backgroundColor: '#555555',
  },
  
  uploadIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  
  uploadText: {
    color: gymTheme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  
  feedbackStatus: {
    alignItems: 'center',
    paddingTop: gymTheme.spacing.sm,
  },
  
  feedbackReceived: {
    backgroundColor: gymTheme.colors.success,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.medium,
  },
  
  feedbackReceivedText: {
    color: gymTheme.colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  
  feedbackReadyButton: {
    backgroundColor: gymTheme.colors.accent,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.medium,
  },
  
  feedbackReadyText: {
    color: gymTheme.colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  
  feedbackWaitingText: {
    color: gymTheme.colors.textMuted,
    fontSize: 12,
  },
  
  refreshButton: {
    borderRadius: gymTheme.borderRadius.medium,
    overflow: 'hidden',
    marginTop: gymTheme.spacing.md,
  },
  
  refreshContainer: {
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.medium,
  },
  
  refreshText: {
    color: gymTheme.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
}); 