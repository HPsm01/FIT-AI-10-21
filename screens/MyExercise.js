import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar,
  Alert, PermissionsAndroid, Platform, Linking, Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { UserContext } from './UserContext';
import { gymTheme } from '../styles/theme';
import CommonHeader from './CommonHeader';

// ================================
// API/유틸
// ================================
const API_BASE = 'http://13.209.67.129:8000';
const EXERCISE_DIR = { deadlift: 'deadlift', squat: 'squat', bench_press: 'bench_press' };

// 사용자 이름 포맷(업로드/다운로드 동일 폴더명 유지)
const sanitizeName = (u) => (u?.username || u?.name || '').replace(/\s+/g, '');

// YYYYMMDD (디바이스 로컬 기준; 필요 시 KST 로직 추가)
const toYYYYMMDD = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

// yyyyMMddHHmmss
const buildTimestamp14 = (d = new Date()) => {
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
};

// ✅ 업로드용 S3 키(서버 파이프라인 형식)
const buildUploadKey = (user, weightKg, ts17) => {
  const name = sanitizeName(user);
  const w = String(weightKg ?? '0');
  return `fitvideo/${user.id}_${name}_${w}_${ts17}.mp4`;
};

// (선택) 업로드 presign(put) — 업로드 화면에서 사용할 때
const getPresignedPutUrl = async (key, contentType = 'video/mp4') => {
  const qs = new URLSearchParams({ key, content_type: contentType });
  const res = await fetch(`${API_BASE}/s3/presign?${qs.toString()}`);
  if (!res.ok) throw new Error('Presign(put) 실패');
  const { url } = await res.json();
  return url;
};

// ✅ 결과영상 presign(get) — 날짜+세트 기반
const getAnalyzedPresignedUrlByDateSet = async ({
  user,
  dateYmd,           // "YYYYMMDD"
  setNo,             // 1,2,3...
  exerciseValue,     // 'squat' | 'deadlift' | 'bench_press'
  download = true,
}) => {
  const params = new URLSearchParams({
    yyyymmdd: dateYmd,
    set_no: String(setNo),
    user_id: String(user.id),
    user_name: sanitizeName(user), // 업로드때와 동일 포맷
    exercise: EXERCISE_DIR[exerciseValue] || 'squat',
    download: download ? 'true' : 'false',
  });
  const res = await fetch(`${API_BASE}/workouts/analyzed-url-by-date?${params.toString()}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`분석영상 Presign(get) 실패: ${t}`);
  }
  const { url } = await res.json();
  return url;
};

// ================================
// 화면/상태
// ================================
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
  weightLocked: false,
}));

export default function MyExerciseScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exerciseSets, setExerciseSets] = useState({
    deadlift: generateSets(),
    squat: generateSets(),
    bench_press: generateSets(),
  });
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [previousWorkouts, setPreviousWorkouts] = useState([]);
  const [showPreviousWorkouts, setShowPreviousWorkouts] = useState(false);

  const today = new Date();
  const formatDate = (date) =>
    `${date.getFullYear().toString().slice(2)}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;

  const formatDateForStorage = (date) =>
    `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;

  // ================================
  // 날짜 관련 함수들
  // ================================
  const changeDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      // 내일 이후로는 이동 불가
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (newDate >= tomorrow) {
        return;
      }
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
    loadExerciseSetsFromStorage(newDate);
    loadPreviousWorkouts(newDate);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // 내일 이후 날짜는 선택 불가
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (selectedDate >= tomorrow) {
        Alert.alert('알림', '미래 날짜는 선택할 수 없습니다.');
        return;
      }
      setSelectedDate(selectedDate);
      loadExerciseSetsFromStorage(selectedDate);
      loadPreviousWorkouts(selectedDate);
    }
  };

  // ================================
  // AsyncStorage 저장/불러오기
  // ================================
  const loadExerciseSetsFromStorage = async (date = selectedDate) => {
    try {
      const key = `exerciseSets_${formatDateForStorage(date)}`;
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setExerciseSets(prev => ({ ...prev, ...parsed }));
      } else {
        // 해당 날짜에 데이터가 없으면 빈 세트로 초기화
        setExerciseSets({
          deadlift: generateSets(),
          squat: generateSets(),
          bench_press: generateSets(),
        });
      }
    } catch (e) {
      console.error('세트 데이터 불러오기 실패:', e);
    }
  };

  const saveExerciseSetsToStorage = async (sets, date = selectedDate) => {
    try {
      const key = `exerciseSets_${formatDateForStorage(date)}`;
      await AsyncStorage.setItem(key, JSON.stringify(sets));
    } catch (e) {
      console.error('세트 데이터 저장 실패:', e);
    }
  };

  // ================================
  // 이전 운동 기록 불러오기
  // ================================
  const loadPreviousWorkouts = async (date = selectedDate) => {
    try {
      const dateStr = formatDateForStorage(date);
      const workouts = [];
      
      // 최근 7일간의 운동 기록을 불러옴
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(date);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = formatDateForStorage(checkDate);
        
        const key = `exerciseSets_${checkDateStr}`;
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          const hasWorkout = Object.values(parsed).some(exercise => 
            exercise.some(set => set.weight && set.weight.trim() !== '')
          );
          
          if (hasWorkout) {
            workouts.push({
              date: checkDateStr,
              displayDate: formatDate(checkDate),
              data: parsed
            });
          }
        }
      }
      
      setPreviousWorkouts(workouts);
    } catch (e) {
      console.error('이전 운동 기록 불러오기 실패:', e);
    }
  };

  useFocusEffect(React.useCallback(() => { 
    loadExerciseSetsFromStorage(); 
    loadPreviousWorkouts();
  }, []));

  // ================================
  // 권한/브라우저 열기
  // ================================
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const v = Platform.Version;
      const permission = v >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
        : PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permission, {
        title: '저장소 권한',
        message: '영상을 갤러리에 저장하기 위해 저장소 권한이 필요합니다.',
        buttonNeutral: '나중에',
        buttonNegative: '취소',
        buttonPositive: '확인',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('권한 요청 오류:', err);
      return false;
    }
  };

  const openPresignedUrl = async (presignedUrl) => {
    try {
      setDownloadingVideo(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          '권한 필요',
          '영상을 저장하기 위해 저장소 권한이 필요합니다.\n\n설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Platform.OS === 'android' && Linking.openSettings() }
          ]
        );
        return;
      }

      Alert.alert(
        '영상 다운로드',
        '피드백 영상을 어떻게 받으시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '브라우저에서 열기',
            onPress: async () => {
              try {
                const supported = await Linking.canOpenURL(presignedUrl);
                if (supported) {
                  await Linking.openURL(presignedUrl);
                  Alert.alert('안내', '브라우저에서 열린 후 "공유 > 저장"으로 기기에 저장하세요.');
                } else {
                  Alert.alert('오류', '브라우저에서 영상을 열 수 없습니다.');
                }
              } catch (e) {
                console.error('영상 열기 오류:', e);
                Alert.alert('오류', '브라우저에서 여는 중 오류가 발생했습니다.');
              } finally {
                setDownloadingVideo(false);
              }
            }
          },
          {
            text: 'URL 복사',
            onPress: () => {
              Alert.alert('영상 URL', presignedUrl);
            }
          }
        ]
      );
    } finally {
      setDownloadingVideo(false);
    }
  };

  // ================================
  // 이벤트 핸들러
  // ================================
  const handleExerciseChange = (val) => {
    saveExerciseSetsToStorage(exerciseSets);
    setSelectedExercise(val);
  };

  const handleWeightChange = (idx, value) => {
    // 오늘 날짜가 아닌 경우 무게 수정 불가
    const isToday = selectedDate.toDateString() === today.toDateString();
    if (!isToday) {
      return;
    }

    // 이미 잠긴 무게나 영상 업로드된 세트는 수정할 수 없음
    const currentSet = exerciseSets[selectedExercise][idx];
    if (currentSet.weightLocked || (currentSet.memo && currentSet.memo !== '피드백 없음')) {
      return;
    }

    setExerciseSets(prev => {
      const updated = prev[selectedExercise].map((s, i) =>
        i === idx ? { ...s, weight: value } : s
      );
      const next = { ...prev, [selectedExercise]: updated };
      saveExerciseSetsToStorage(next);
      return next;
    });
  };

  const handleVideoUpload = (idx) => {
    // 오늘 날짜가 아닌 경우 영상 업로드 불가
    const isToday = selectedDate.toDateString() === today.toDateString();
    if (!isToday) {
      Alert.alert('알림', '오늘 날짜에만 영상 업로드가 가능합니다.');
      return;
    }

    const set = exerciseSets[selectedExercise][idx];
    if (!set.weight || set.weight.trim() === '') {
      Alert.alert('알림', '무게를 먼저 입력해주세요.');
      return;
    }

    // 이미 영상 업로드가 완료된 경우
    if (set.memo && (set.memo.includes('분석 완료') || set.memo.includes('영상 업로드 중'))) {
      Alert.alert('알림', '이미 영상 업로드가 완료되었거나 진행 중인 세트입니다.');
      return;
    }

    // 무게 고정 및 영상 업로드 상태 표시
    setExerciseSets(prev => {
      const updated = prev[selectedExercise].map((s, i) =>
        i === idx ? { ...s, weightLocked: true, memo: '영상 업로드 중...' } : s
      );
      const next = { ...prev, [selectedExercise]: updated };
      saveExerciseSetsToStorage(next);
      return next;
    });

    // 업로드용 키 생성 후 업로드 화면으로 이동
    const weightVal = set.weight || '0';
    const ts14 = buildTimestamp14();
          const uploadKey = buildUploadKey(user, weightVal, ts14);
    navigation.navigate('ExercisePaper', { s3KeyName: uploadKey, exercise: selectedExercise });
  };

  const handleSetChange = (idx, field, value) => {
    setExerciseSets(prev => {
      const updated = prev[selectedExercise].map((s, i) =>
        i === idx ? { ...s, [field]: value } : s
      );
      const next = { ...prev, [selectedExercise]: updated };
      saveExerciseSetsToStorage(next);
      return next;
    });
  };

  const handleAddSet = () => {
    // 오늘 날짜가 아닌 경우 세트 추가 불가
    const isToday = selectedDate.toDateString() === today.toDateString();
    if (!isToday) {
      Alert.alert('알림', '오늘 날짜에만 세트를 추가할 수 있습니다.');
      return;
    }

    setExerciseSets(prev => {
      const next = {
        ...prev,
        [selectedExercise]: [
          ...prev[selectedExercise],
          { set: prev[selectedExercise].length + 1, weight: '', reps: '', feedbackVideo: null, memo: '', weightLocked: false }
        ]
      };
      saveExerciseSetsToStorage(next);
      return next;
    });
  };

    // ✅ 선택된 날짜 + n번째 세트 → presign(get) 호출
  const handleGetFeedbackWithVideo = async (setIndex) => {
    try {
      const url = await getAnalyzedPresignedUrlByDateSet({
        user,
        dateYmd: toYYYYMMDD(selectedDate),
        setNo: setIndex + 1,
        exerciseValue: selectedExercise,
        download: true,
      });
      await openPresignedUrl(url);
      
      // 해당 세트의 메모를 업데이트
      setExerciseSets(prev => {
        const updated = prev[selectedExercise].map((s, i) =>
          i === setIndex ? { ...s, memo: '분석 완료 - 피드백 영상 확인 가능' } : s
        );
        const next = { ...prev, [selectedExercise]: updated };
        saveExerciseSetsToStorage(next);
        return next;
      });
      
    } catch (error) {
      console.error('피드백 받기 오류:', error);
      Alert.alert('오류', '피드백 영상 URL 발급 중 문제가 발생했습니다.');
    }
  };

  // ================================
  // 피드백 메모 갱신(선택된 날짜, 선택 운동만)
  // ================================
  const fetchFeedback = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE}/workouts/users/${user.id}/today?exercise=${selectedExercise}`);
      if (!res.ok) return;
      const list = await res.json();
      setExerciseSets(prev => {
        const next = {
          ...prev,
          [selectedExercise]: prev[selectedExercise].map((set, idx) => {
            const fb = list[idx]?.feedback;
            const memo = fb?.depth ? fb.depth : '피드백 없음';
            return { ...set, memo };
          })
        };
        saveExerciseSetsToStorage(next);
        return next;
      });
    } catch (e) {
      console.log('피드백 불러오기 실패:', e);
    }
  };

  useEffect(() => { fetchFeedback(); }, [user?.id, selectedExercise]);



  // ================================
  // UI
  // ================================
  const sets = exerciseSets[selectedExercise];
  const selectedExerciseInfo = exerciseTypes.find(e => e.value === selectedExercise);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.dateHeader}>
          <TouchableOpacity onPress={() => changeDate('prev')} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>◀</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={openDatePicker} style={styles.dateSelector}>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            <Text style={styles.dateSelectorText}>📅 날짜 변경</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => changeDate('next')} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>▶</Text>
          </TouchableOpacity>
        </View>
        
        <CommonHeader 
          navigation={navigation}
          title="운동 기록"
          showBackButton={false}
        />
        
        <TouchableOpacity 
          style={styles.previousWorkoutsButton}
          onPress={() => setShowPreviousWorkouts(true)}
        >
          <Text style={styles.previousWorkoutsButtonText}>📚 이전 운동 기록 보기</Text>
        </TouchableOpacity>
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
            <Text style={styles.setsTitle}>{formatDate(selectedDate)}의 세트</Text>
          </View>

          {sets.map((set, idx) => (
            <View key={idx} style={styles.setCard}>
              <View style={styles.setHeader}>
                <Text style={styles.setNumber}>{set.set}세트</Text>

                <View style={styles.weightContainer}>
                  <TextInput
                    style={[
                      styles.weightInput,
                      !set.weight || set.weight.trim() === '' ? styles.weightInputRequired : null,
                      (set.weightLocked || (set.memo && set.memo !== '피드백 없음') || selectedDate.toDateString() !== today.toDateString()) ? styles.weightInputLocked : null
                    ]}
                    value={set.weight?.toString() ?? ''}
                    onChangeText={txt => handleWeightChange(idx, txt.replace(/[^0-9]/g, '').slice(0,3))}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholder="무게"
                    placeholderTextColor={gymTheme.colors.textMuted}
                    editable={!set.weightLocked && (!set.memo || set.memo === '피드백 없음') && selectedDate.toDateString() === today.toDateString()}
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

                {!set.memo || set.memo === '피드백 없음' ? (
                  <TouchableOpacity
                    style={[
                      styles.uploadButton,
                      !set.weight || set.weight.trim() === '' || selectedDate.toDateString() !== today.toDateString() ? styles.uploadButtonDisabled : null
                    ]}
                    onPress={() => handleVideoUpload(idx)}
                    disabled={!set.weight || set.weight.trim() === '' || selectedDate.toDateString() !== today.toDateString()}>
                    <View style={[
                      styles.uploadContainer,
                      set.weight && set.weight.trim() !== '' && selectedDate.toDateString() === today.toDateString() ? styles.uploadActive : styles.uploadInactive
                    ]}>
                      <Text style={styles.uploadIcon}>📹</Text>
                      <Text style={styles.uploadText}>
                        {selectedDate.toDateString() === today.toDateString() ? '영상 업로드' : '오늘만 가능'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : set.memo && set.memo.includes('분석 완료') ? (
                  <TouchableOpacity
                    style={styles.analysisButton}
                    onPress={() => handleGetFeedbackWithVideo(idx)}>
                    <View style={styles.analysisContainer}>
                      <Text style={styles.analysisIcon}>📊</Text>
                      <Text style={styles.analysisText}>분석 영상 보기</Text>
                    </View>
                  </TouchableOpacity>
                ) : set.memo && set.memo.includes('영상 업로드 중') ? (
                  <View style={styles.uploadingContainer}>
                    <Text style={styles.uploadingIcon}>⏳</Text>
                    <Text style={styles.uploadingText}>영상 업로드 중...</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.analysisButton}
                    onPress={() => handleGetFeedbackWithVideo(idx)}>
                    <View style={styles.analysisContainer}>
                      <Text style={styles.analysisIcon}>📊</Text>
                      <Text style={styles.analysisText}>분석 영상 보기</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>


            </View>
          ))}

          {/* 세트 추가 - 오늘 날짜에만 표시 */}
          {selectedDate.toDateString() === today.toDateString() && (
            <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
              <Text style={styles.addSetText}>+ 세트 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 새로고침 */}
        <TouchableOpacity style={styles.refreshButton} onPress={fetchFeedback}>
          <View style={styles.refreshContainer}>
            <Text style={styles.refreshText}>🔄 피드백 새로고침</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* 날짜 선택 모달 */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>날짜 선택</Text>
            <View style={styles.datePickerContainer}>
                                <Picker
                    selectedValue={selectedDate.getFullYear()}
                    style={styles.yearPicker}
                    onValueChange={(year) => {
                      const newDate = new Date(selectedDate);
                      newDate.setFullYear(year);
                      // 미래 날짜 체크
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      if (newDate >= tomorrow) {
                        return;
                      }
                      setSelectedDate(newDate);
                    }}
                  >
                    {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i).map(year => (
                      <Picker.Item key={year} label={String(year)} value={year} />
                    ))}
                  </Picker>
                                <Picker
                    selectedValue={selectedDate.getMonth() + 1}
                    style={styles.monthPicker}
                    onValueChange={(month) => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(month - 1);
                      // 미래 날짜 체크
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      if (newDate >= tomorrow) {
                        return;
                      }
                      setSelectedDate(newDate);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <Picker.Item key={month} label={String(month)} value={month} />
                    ))}
                  </Picker>
                  <Picker
                    selectedValue={selectedDate.getDate()}
                    style={styles.dayPicker}
                    onValueChange={(day) => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(day);
                      // 미래 날짜 체크
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      if (newDate >= tomorrow) {
                        return;
                      }
                      setSelectedDate(newDate);
                    }}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <Picker.Item key={day} label={String(day)} value={day} />
                    ))}
                  </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]} 
                onPress={() => {
                  setShowDatePicker(false);
                  loadExerciseSetsFromStorage();
                  loadPreviousWorkouts();
                }}
              >
                <Text style={styles.modalButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 이전 운동 기록 모달 */}
      <Modal
        visible={showPreviousWorkouts}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>이전 운동 기록</Text>
            <ScrollView style={styles.previousWorkoutsList}>
              {previousWorkouts.length > 0 ? (
                previousWorkouts.map((workout, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.previousWorkoutItem}
                    onPress={() => {
                      setSelectedDate(new Date(workout.date));
                      setShowPreviousWorkouts(false);
                      loadExerciseSetsFromStorage(new Date(workout.date));
                    }}
                  >
                    <Text style={styles.previousWorkoutDate}>{workout.displayDate}</Text>
                    <View style={styles.previousWorkoutSummary}>
                      {Object.entries(workout.data).map(([exercise, sets]) => {
                        const completedSets = sets.filter(set => set.weight && set.weight.trim() !== '');
                        if (completedSets.length > 0) {
                          return (
                            <Text key={exercise} style={styles.previousWorkoutExercise}>
                              {exerciseTypes.find(e => e.value === exercise)?.label}: {completedSets.length}세트
                            </Text>
                          );
                        }
                        return null;
                      })}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noPreviousWorkouts}>이전 운동 기록이 없습니다.</Text>
              )}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setShowPreviousWorkouts(false)}
            >
              <Text style={styles.modalButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ================================
// Styles
// ================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: gymTheme.colors.primary },
  header: {
    backgroundColor: gymTheme.colors.secondary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: gymTheme.spacing.lg,
    alignItems: 'center',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateArrow: {
    padding: 10,
  },
  dateArrowText: {
    fontSize: 20,
    color: gymTheme.colors.accent,
    fontWeight: 'bold',
  },
  dateSelector: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  dateText: { 
    fontSize: 18, 
    color: gymTheme.colors.text, 
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateSelectorText: {
    fontSize: 12,
    color: gymTheme.colors.accent,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: gymTheme.colors.text, marginBottom: 10 },
  previousWorkoutsButton: {
    backgroundColor: gymTheme.colors.accent,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.medium,
  },
  previousWorkoutsButtonText: {
    color: gymTheme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: { flex: 1 },
  content: { padding: gymTheme.spacing.lg },

  exerciseCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: gymTheme.spacing.md },
  exerciseIcon: { fontSize: 24, marginRight: gymTheme.spacing.sm },
  exerciseName: { fontSize: 20, fontWeight: 'bold', color: gymTheme.colors.text },
  pickerContainer: {
    backgroundColor: gymTheme.colors.input,
    borderRadius: gymTheme.borderRadius.medium,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
  },
  picker: { color: gymTheme.colors.text },

  setsContainer: { marginBottom: gymTheme.spacing.lg },
  setsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  setsTitle: { fontSize: 18, fontWeight: 'bold', color: gymTheme.colors.text },

  setCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.md,
    ...gymTheme.shadows.medium,
  },
  setHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  setNumber: { fontSize: 16, fontWeight: 'bold', color: gymTheme.colors.accent },

  weightContainer: { flexDirection: 'row', alignItems: 'center' },
  weightInput: {
    width: 60, height: 40, borderWidth: 1, borderColor: gymTheme.colors.border,
    borderRadius: gymTheme.borderRadius.small, textAlign: 'center', marginRight: 8,
    backgroundColor: gymTheme.colors.input, color: gymTheme.colors.text, fontSize: 16,
  },
  weightInputRequired: { borderColor: gymTheme.colors.error, borderWidth: 2 },
  weightInputLocked: {
    backgroundColor: gymTheme.colors.success, borderColor: gymTheme.colors.success,
    color: gymTheme.colors.text, fontWeight: 'bold',
  },
  weightUnit: { fontSize: 16, color: gymTheme.colors.textSecondary, marginRight: 8 },

  setContent: { marginBottom: gymTheme.spacing.md },
  memoContainer: { marginBottom: gymTheme.spacing.md },
  memoLabel: { fontSize: 14, color: gymTheme.colors.textSecondary, marginBottom: 4 },
  memoText: {
    fontSize: 14, color: gymTheme.colors.text, backgroundColor: gymTheme.colors.input,
    padding: gymTheme.spacing.sm, borderRadius: gymTheme.borderRadius.small, minHeight: 40,
  },

  uploadButton: { borderRadius: gymTheme.borderRadius.medium, overflow: 'hidden' },
  uploadButtonDisabled: { opacity: 0.5 },
  uploadContainer: {
    paddingVertical: gymTheme.spacing.md, alignItems: 'center', justifyContent: 'center',
    borderRadius: gymTheme.borderRadius.medium,
  },
  uploadActive: { backgroundColor: gymTheme.colors.accent },
  uploadInactive: { backgroundColor: '#555555' },
  uploadIcon: { fontSize: 20, marginBottom: 4 },
  uploadText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 14 },



  addSetButton: {
    backgroundColor: gymTheme.colors.accent, paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm, borderRadius: gymTheme.borderRadius.medium,
  },
  addSetText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 14 },

  refreshButton: { borderRadius: gymTheme.borderRadius.medium, overflow: 'hidden', marginTop: gymTheme.spacing.md },
  refreshContainer: {
    paddingVertical: gymTheme.spacing.md, alignItems: 'center',
    backgroundColor: gymTheme.colors.accent, borderRadius: gymTheme.borderRadius.medium,
  },
  refreshText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 16 },

  // 분석 영상 보기 버튼 스타일
  analysisButton: { borderRadius: gymTheme.borderRadius.medium, overflow: 'hidden' },
  analysisContainer: {
    paddingVertical: gymTheme.spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gymTheme.colors.success, borderRadius: gymTheme.borderRadius.medium,
  },
  analysisIcon: { fontSize: 20, marginBottom: 4 },
  analysisText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 14 },

  // 영상 업로드 중 상태 스타일
  uploadingContainer: {
    paddingVertical: gymTheme.spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gymTheme.colors.warning || '#FFA500', borderRadius: gymTheme.borderRadius.medium,
  },
  uploadingIcon: { fontSize: 20, marginBottom: 4 },
  uploadingText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 14 },

  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    width: '90%',
    maxHeight: '80%',
    ...gymTheme.shadows.large,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: gymTheme.spacing.lg,
  },
  yearPicker: { width: 80, height: 120 },
  monthPicker: { width: 80, height: 120 },
  dayPicker: { width: 80, height: 120 },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    backgroundColor: gymTheme.colors.input,
    paddingHorizontal: gymTheme.spacing.lg,
    paddingVertical: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.medium,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    backgroundColor: gymTheme.colors.accent,
  },
  modalButtonText: {
    color: gymTheme.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },

  // 이전 운동 기록 스타일
  previousWorkoutsList: {
    maxHeight: 300,
    marginBottom: gymTheme.spacing.lg,
  },
  previousWorkoutItem: {
    backgroundColor: gymTheme.colors.input,
    padding: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.medium,
    marginBottom: gymTheme.spacing.sm,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
  },
  previousWorkoutDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    marginBottom: gymTheme.spacing.sm,
  },
  previousWorkoutSummary: {
    gap: 4,
  },
  previousWorkoutExercise: {
    fontSize: 14,
    color: gymTheme.colors.text,
  },
  noPreviousWorkouts: {
    fontSize: 16,
    color: gymTheme.colors.textMuted,
    textAlign: 'center',
    padding: gymTheme.spacing.lg,
  },
});
