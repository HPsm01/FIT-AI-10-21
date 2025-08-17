import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert, PermissionsAndroid, Platform, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
// LinearGradient 모듈 제거
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
  const [downloadingVideo, setDownloadingVideo] = useState(false);

  const today = new Date();
  const formatDate = (date) => `${date.getFullYear().toString().slice(2)}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;

  // 권한 요청 함수 (Android만)
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Android 13 이상에서는 READ_MEDIA_VIDEO 권한 사용
        const androidVersion = Platform.Version;
        let permission;
        
        if (androidVersion >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO;
        } else {
          permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
        }
        
        const granted = await PermissionsAndroid.request(
          permission,
          {
            title: "저장소 권한",
            message: "영상을 갤러리에 저장하기 위해 저장소 권한이 필요합니다.",
            buttonNeutral: "나중에",
            buttonNegative: "취소",
            buttonPositive: "확인"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('권한 요청 오류:', err);
        return false;
      }
    }
    return true;
  };

  // S3에서 영상 다운로드 및 갤러리에 저장
  const downloadAndSaveToGallery = async (s3Key) => {
  try {
    setDownloadingVideo(true);
    
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert(
        '권한 필요', 
        '영상을 저장하기 위해 저장소 권한이 필요합니다.\n\n설정에서 권한을 허용해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '설정으로 이동', 
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      return;
    }

    // ✅ Presigned GET URL 요청 (분석된 영상 다운로드용)
    const prefix = s3Key.startsWith("fitvideoresult/") ? "" : "fitvideoresult/";
    const res = await fetch(`http://13.209.67.129:8000/s3/presigned-url?key=${prefix}${s3Key}`);
    if (!res.ok) throw new Error("Presigned URL 발급 실패");
    const { url: s3Url } = await res.json();

    Alert.alert(
      '영상 다운로드',
      '피드백 영상을 어떻게 받으시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '브라우저에서 열기', 
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(s3Url);
              if (supported) {
                await Linking.openURL(s3Url);
                Alert.alert(
                  '다운로드 안내',
                  '브라우저에서 영상이 열렸습니다.\n\n우클릭 또는 "공유 > 저장"을 통해 저장할 수 있습니다.',
                  [{ text: '확인' }]
                );
              } else {
                Alert.alert('오류', '브라우저에서 영상을 열 수 없습니다.');
              }
            } catch (error) {
              console.error('영상 열기 오류:', error);
              Alert.alert('오류', '브라우저에서 영상을 여는 중 오류가 발생했습니다.');
            } finally {
              setDownloadingVideo(false);
            }
          }
        },
        {
          text: 'URL 복사',
          onPress: () => {
            Alert.alert(
              '영상 URL', 
              `영상 URL: ${s3Url}\n\n이 URL을 복사해서 브라우저에 붙여넣어 확인하세요.`,
              [{ text: '확인' }]
            );
          }
        }
      ]
    );
    
  } catch (error) {
    console.error('영상 처리 오류:', error);
    Alert.alert('오류', '영상 처리 중 오류가 발생했습니다.');
  } finally {
    setDownloadingVideo(false);
  }
};


const handleGetFeedbackWithVideo = async (setIndex) => {
  try {
    // 🔄 분석 결과 피드백 불러오기
    const res = await fetch(`http://13.209.67.129:8000/workouts/users/${user.id}/today?exercise=${selectedExercise}`);
    const workoutList = await res.json();
    const workout = workoutList[setIndex];
    const s3Key = workout?.s3_key;

    if (!s3Key) {
      Alert.alert("오류", "분석된 영상 경로를 찾을 수 없습니다.");
      return;
    }

    // ✅ 존재하는 분석된 영상 경로로 presigned GET 요청
    await downloadAndSaveToGallery(s3Key);

    setFeedbackReceivedArr(prev => {
      const newArr = [...prev];
      newArr[setIndex] = true;
      return newArr;
    });

  } catch (error) {
    console.error('피드백 받기 오류:', error);
    Alert.alert('오류', '피드백을 받는 중 오류가 발생했습니다.');
  }
};


  const handleExerciseChange = (itemValue) => {
    setSelectedExercise(itemValue);
  };

  const handleSetChange = (idx, field, value) => {
  setExerciseSets(prev => {
    const updatedSets = prev[selectedExercise].map((set, i) => {
      if (i === idx) {
        return {
          ...set,
          [field]: value
        };
      } else {
        return set;
      }
    });

    return {
      ...prev,
      [selectedExercise]: updatedSets
    };
  });
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

  const fetchFeedback = async () => {
    if (!user?.id) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`http://13.209.67.129:8000/workouts/users/${user.id}/today?exercise=${selectedExercise}`);
      if (!res.ok) return;
      const feedbackList = await res.json();
      setExerciseSets(prev => ({
        ...prev,
        [selectedExercise]: prev[selectedExercise].map((set, idx) => {
          const fb = feedbackList[idx]?.feedback;
          let memo = '피드백 없음';
          if (fb && fb.depth) {
            memo = fb.depth;
          }
          return {
            ...set,
            memo,
          };
        }),
      }));
    } catch (e) {
      console.log('피드백 불러오기 실패:', e);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [user?.id, selectedExercise]);

  useEffect(() => {
    setFeedbackReadyArr(Array(exerciseSets[selectedExercise].length).fill(false));
    setFeedbackReceivedArr(Array(exerciseSets[selectedExercise].length).fill(false));
  }, [selectedExercise, exerciseSets[selectedExercise].length]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(
          `http://13.209.67.129:8000/workouts/user?user_id=${user.id}`
        );
        if (!res.ok) return;
        const feedbackList = await res.json();
        setLatestFeedbackList(feedbackList);
        setFeedbackReadyArr((prev) =>
          prev.map((ready, idx) => !!feedbackList[idx]?.feedback)
        );
      } catch (e) {
        console.log("피드백 갱신 실패:", e);
      }
    }, 3000);
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
                  <Text style={styles.memoText}>
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

              {/* 피드백 상태 */}
              <View style={styles.feedbackStatus}>
                {feedbackReceivedArr[idx] ? (
                  <View style={styles.feedbackReceived}>
                    <Text style={styles.feedbackReceivedText}>✅ 피드백 완료</Text>
                  </View>
                ) : feedbackReadyArr[idx] ? (
                  <TouchableOpacity 
                    style={[
                      styles.feedbackReadyButton,
                      downloadingVideo ? styles.feedbackReadyButtonDisabled : null
                    ]}
                    onPress={() => handleGetFeedbackWithVideo(idx)}
                    disabled={downloadingVideo}
                  >
                    <Text style={styles.feedbackReadyText}>
                      {downloadingVideo ? '📥 다운로드 중...' : '📊 피드백 받기'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.feedbackWaitingText}>⏳ 피드백 대기 중</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 피드백 새로고침 버튼 */}
        <TouchableOpacity style={styles.refreshButton} onPress={fetchFeedback}>
          <View style={styles.refreshContainer}>
            <Text style={styles.refreshText}>🔄 피드백 새로고침</Text>
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
  
  feedbackReadyButtonDisabled: {
    opacity: 0.5,
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
