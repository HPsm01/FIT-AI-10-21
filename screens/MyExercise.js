import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar,
  Alert, PermissionsAndroid, Platform, Linking, Modal, AppState, BackHandler
} from 'react-native';
import Video from 'react-native-video';
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

// S3 경로 수정 (fitvideoresult 폴더 사용)
const S3_RESULT_FOLDER = 'fitvideoresult';

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

// ✅ 선택한 운동 문자열 → ID(1/2/3)
const exerciseTypes = [
  { label: 'Deadlift', value: 'deadlift', id: 1, icon: '🏋️' },
  { label: 'Squat', value: 'squat', id: 2, icon: '🦵' },
  { label: 'Bench Press', value: 'bench_press', id: 3, icon: '💪' },
];
const getExerciseId = (exerciseValue) => {
  const ex = exerciseTypes.find(e => e.value === exerciseValue);
  return ex ? ex.id : 2; // 기본 squat
};

// ✅ 업로드용 S3 키(서버 파이프라인 형식, 5토큰 포함)
// 최종: fitvideo/{userId}_{userName}_{weightKg}_{exerciseId}_{timestamp}.mp4
const buildUploadKey = (user, weightKg, exerciseValue, ts14) => {
  const name = sanitizeName(user);
  const w = String(weightKg ?? '0');
  const exerciseId = getExerciseId(exerciseValue);
  return `fitvideo/${user.id}_${name}_${w}_${exerciseId}_${ts14}.mp4`;
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
  try {
    // 서버 API로 시도
    const params = new URLSearchParams({
      yyyymmdd: dateYmd,
      set_no: String(setNo),
      user_id: String(user.id),
      user_name: sanitizeName(user),
      exercise: EXERCISE_DIR[exerciseValue] || 'squat',
      download: download ? 'true' : 'false',
    });
    const apiUrl = `${API_BASE}/workouts/analyzed-url-by-date?${params.toString()}`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const responseData = await res.json();
      if (responseData.url) return responseData.url;
    }

    // 실패 시(백업 경로들 시도 — 운영 환경에선 서버 API만 쓰는 걸 권장)
    const s3Path = `fitvideoresult/${user.id}_${user.name}/${dateYmd}/${exerciseValue}/set${setNo}_${dateYmd}160000.mp4`;
    const directS3Url = `https://thefit-bucket.s3.ap-northeast-2.amazonaws.com/${s3Path}`;
    const headRes = await fetch(directS3Url, { method: 'HEAD' });
    if (headRes.ok) return directS3Url;

    throw new Error(`분석영상 URL을 가져올 수 없습니다. 서버 API: ${res.status}`);
  } catch (error) {
    console.error('❌ getAnalyzedPresignedUrlByDateSet 오류:', error);
    throw error;
  }
};

// ✅ 생성일 기준 날짜별 운동(총 reps 포함) 조회
const apiGetWorkoutsByDate = async ({ userId, dateYmd, exerciseValue }) => {
  const qs = new URLSearchParams({ exercise: exerciseValue });
  const url = `${API_BASE}/workouts/users/${userId}/date=${dateYmd}?${qs.toString()}`;
  console.log('📊 날짜별 운동 데이터 API:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const payload = await res.json(); // { user_id, date, exercise_id, total_reps, items: [...] }
  return payload;
};

// ================================
// 화면/상태
// ================================
const generateSets = () => Array.from({ length: 5 }, (_, i) => ({
  set: i + 1,
  weight: '',
  reps: '',
  feedbackVideo: null,
  memo: '',
  weightLocked: false,
}));

export default function MyExerciseScreen({ navigation }) {
  const { user, elapsed, isWorkingOut } = useContext(UserContext);
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exerciseSets, setExerciseSets] = useState({
    deadlift: generateSets(),
    squat: generateSets(),
    bench_press: generateSets(),
  });
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [dailyTotalReps, setDailyTotalReps] = useState(0);   // ← 총 반복수
  
  // 비디오 플레이어 관련 상태
  const [videoUri, setVideoUri] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // 오늘 날짜를 실시간으로 가져오는 함수
  const getToday = () => new Date();

  const formatDate = (date) =>
    `${date.getFullYear().toString().slice(2)}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;

  const formatDateForStorage = (date) =>
    `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;

  // YYYY-MM-DD 문자열 반환(가독 헬퍼)
  const toYMD = (d) => formatDateForStorage(d);

  // ================================
  // 날짜 관련 함수들
  // ================================
  const changeDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      // 오늘 날짜까지만 이동 가능 (내일로는 이동 불가)
      const today = getToday();
      // 오늘 날짜와 같거나 크면 이동 불가
      if (newDate.getDate() >= today.getDate() && 
          newDate.getMonth() === today.getMonth() && 
          newDate.getFullYear() === today.getFullYear()) {
        return; // 오늘 날짜 이상이면 이동 불가
      }
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
    // 날짜 변경 시 서버 데이터도 함께 불러오기
    loadExerciseSetsFromStorage(newDate);
  };

  const openDatePicker = () => setShowDatePicker(true);

  const onDateChange = (event, picked) => {
    setShowDatePicker(false);
    if (picked) {
      const today = getToday();
      // 오늘 날짜보다 크면 선택 불가
      if (picked.getDate() > today.getDate() || 
          picked.getMonth() > today.getMonth() || 
          picked.getFullYear() > today.getFullYear()) {
        Alert.alert('알림', '오늘 날짜까지만 선택할 수 있습니다.');
        return;
      }
      setSelectedDate(picked);
      loadExerciseSetsFromStorage(picked);
      loadPreviousWorkouts(picked);
    }
  };

  // ================================
  // AsyncStorage 저장/불러오기 + 서버 데이터 병합
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

      // 서버에서도 해당 날짜의 운동 데이터를 불러와서 병합
      await loadExerciseDataFromServer(date);

    } catch (e) {
      console.error('세트 데이터 불러오기 실패:', e);
    }
  };

  // 서버에서 특정 날짜의 운동 데이터(생성일 기준) 불러와서 로컬과 병합
  const loadExerciseDataFromServer = async (date) => {
    if (!user?.id) return;
    try {
      const ymd = formatDateForStorage(date); // YYYY-MM-DD
      const payload = await apiGetWorkoutsByDate({
        userId: user.id,
        dateYmd: ymd,
        exerciseValue: selectedExercise,
      });

      // 총 reps 상태 반영
      setDailyTotalReps(payload?.total_reps ?? 0);

      const serverList = Array.isArray(payload?.items) ? payload.items : [];

      if (serverList.length > 0) {
        // 서버 → 로컬 세트 형태로 변환
        const normalized = serverList.map((it, idx) => ({
          exercise: selectedExercise,
          weight: it.weight || '',
          reps: it.rep_cnt || '',
          memo: it.feedback?.depth || '피드백 없음',
          weightLocked: !!it.weight,
        }));

        const merged = mergeServerDataWithLocal(exerciseSets, normalized);
        setExerciseSets(merged);
        await saveExerciseSetsToStorage(merged, date);
        console.log('✅ 날짜별 서버 데이터 병합 완료');
      } else {
        // 서버 데이터 없음 → total=0 반영
        setDailyTotalReps(0);
        console.log('ℹ️ 해당 날짜에 서버 데이터 없음');
      }
    } catch (e) {
      console.error('❌ 날짜별 서버 데이터 불러오기 실패:', e);
      setDailyTotalReps(0);
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
  // 이전 운동 기록 불러오기 (AsyncStorage + 서버 데이터 병합)
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

        // AsyncStorage에서 데이터 확인
        const key = `exerciseSets_${checkDateStr}`;
        const saved = await AsyncStorage.getItem(key);
        let workoutData = null;

        if (saved) workoutData = JSON.parse(saved);

        // 운동 기록이 있는지 확인
        if (workoutData) {
          const hasWorkout = Object.values(workoutData).some(exercise =>
            exercise.some(set => set.weight && set.weight.trim() !== '')
          );

          if (hasWorkout) {
            workouts.push({
              date: checkDateStr,
              displayDate: formatDate(checkDate),
              data: workoutData
            });
          }
        }
      }

      // 필요 시 setPreviousWorkouts(workouts);
    } catch (e) {
      console.error('이전 운동 기록 불러오기 실패:', e);
    }
  };

  // 서버 데이터와 로컬 데이터 병합
  const mergeServerDataWithLocal = (localData, serverData) => {
    const merged = { ...localData };

    Object.keys(merged).forEach(exercise => {
      if (merged[exercise] && Array.isArray(merged[exercise])) {
        merged[exercise] = merged[exercise].map((set, idx) => {
          const serverSet = serverData[idx];
          if (serverSet) {
            return {
              ...set,
              weight: serverSet.weight || set.weight,
              reps: serverSet.reps || set.reps,
              memo: serverSet.memo || set.memo || '피드백 없음',
              weightLocked: serverSet.weight ? true : set.weightLocked,
            };
          }
          return set;
        });
      }
    });

    return merged;
  };

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
            text: '바로 재생하기',
            onPress: () => {
              setVideoUri(presignedUrl);
              setShowVideoPlayer(true);
            }
          },
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
    // 운동 변경 시 해당 날짜 데이터 갱신
    loadExerciseDataFromServer(selectedDate);
  };

  const handleWeightChange = (idx, value) => {
    // 오늘 날짜가 아닌 경우 무게 수정 불가
    const isToday = selectedDate.toDateString() === getToday().toDateString();
    if (!isToday) return;

    // 이미 잠긴 무게나 영상 업로드된 세트는 수정할 수 없음
    const currentSet = exerciseSets[selectedExercise][idx];
    if (currentSet.weightLocked || (currentSet.memo && currentSet.memo !== '피드백 없음')) return;

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
    const isToday = selectedDate.toDateString() === getToday().toDateString();
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

    // 업로드용 키 생성 후 업로드 화면으로 이동 (⚠️ exerciseId 포함)
    const weightVal = set.weight || '0';
    const ts14 = buildTimestamp14();
    const uploadKey = buildUploadKey(user, weightVal, selectedExercise, ts14);

    navigation.navigate('ExercisePaper', {
      s3KeyName: uploadKey,
      exercise: selectedExercise,                 // 'squat' | 'deadlift' | 'bench_press'
      exerciseId: getExerciseId(selectedExercise) // 1 | 2 | 3
    });
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
    const isToday = selectedDate.toDateString() === getToday().toDateString();
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

  // ✅ 선택된 날짜 + n번째 세트 → presign(get) 호출 (과거 날짜도 가능)
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

      // 해당 세트의 메모 업데이트
      setExerciseSets(prev => {
        const updated = prev[selectedExercise].map((s, i) =>
          i === setIndex ? { ...s, memo: '분석 완료 - 피드백 영상 확인 가능' } : s
        );
        const next = { ...prev, [selectedExercise]: updated };
        saveExerciseSetsToStorage(next);
        return next;
      });

    } catch (error) {
      console.error('❌ 피드백 받기 오류:', error);
      let errorMessage = '피드백 영상 URL 발급 중 문제가 발생했습니다.';
      if (String(error.message).includes('404')) errorMessage = '해당 날짜/세트의 피드백 영상을 찾을 수 없습니다.';
      else if (String(error.message).includes('500')) errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      else if (String(error.message).includes('URL')) errorMessage = '서버에서 영상 URL을 제공하지 못했습니다.';
      Alert.alert('피드백 영상 오류', errorMessage);
    }
  };

  // ================================
  // 피드백 메모 갱신(선택된 날짜, 선택 운동만)
  // ================================
  const fetchFeedback = async () => {
    if (!user?.id) return;
    try {
      const ymd = formatDateForStorage(selectedDate);
      const payload = await apiGetWorkoutsByDate({
        userId: user.id,
        dateYmd: ymd,
        exerciseValue: selectedExercise,
      });

      setDailyTotalReps(payload?.total_reps ?? 0);

      const list = Array.isArray(payload?.items) ? payload.items : [];
      if (list.length > 0) {
        const serverData = list.map(item => ({
          exercise: selectedExercise,
          weight: item.weight || '',
          reps: item.rep_cnt || '',
          memo: item.feedback?.depth || '피드백 없음',
          weightLocked: !!item.weight,
        }));

        setExerciseSets(prev => {
          const updated = { ...prev };
          updated[selectedExercise] = updated[selectedExercise].map((set, idx) => {
            const serverSet = serverData[idx];
            return serverSet ? { ...set, ...serverSet } : set;
          });
          return updated;
        });
      }
    } catch (e) {
      console.error('피드백 데이터 불러오기 실패:', e);
      setDailyTotalReps(0);
    }
  };

  useFocusEffect(React.useCallback(() => {
    loadExerciseSetsFromStorage();
    loadPreviousWorkouts();
    checkCheckInStatus();
  }, []));

  // 하드웨어 백 버튼 핸들러
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // 이전 페이지로 돌아가기
        navigation.goBack();
        return true; // 기본 백 동작 방지
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [navigation])
  );

  // 입실 상태 확인 함수
  const checkCheckInStatus = async () => {
    try {
      const checkInTime = await AsyncStorage.getItem('checkInTime');
      if (!checkInTime) {
        Alert.alert(
          '입실 기록 없음',
          '입실 기록이 없습니다. 입실 화면으로 이동합니다.',
          [
            {
              text: '확인',
              onPress: () => navigation.reset({ index: 0, routes: [{ name: 'CheckIn' }] }),
            },
          ]
        );
      }
    } catch (error) {
      console.error('입실 상태 확인 중 오류:', error);
    }
  };

  useEffect(() => { fetchFeedback(); }, [user?.id, selectedExercise, selectedDate]);

  // 앱 상태 변화 감지 및 강제퇴실 기능
  useEffect(() => {
    let backgroundTimer = null;
    let isLoggedOut = false;

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!isLoggedOut) {
          Alert.alert(
            '앱 종료 경고',
            '앱을 종료하면 3초 후 자동으로 로그아웃됩니다.',
            [
              { text: '취소', style: 'cancel' },
              { text: '종료', onPress: () => {
                backgroundTimer = setTimeout(() => {
                  if (!isLoggedOut) handleForceLogout();
                }, 3000);
              }}
            ]
          );
        }
      } else if (nextAppState === 'active') {
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
      }
    };

    const handleForceLogout = async () => {
      if (isLoggedOut) return;
      isLoggedOut = true;

      try {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('userToken');

        const keys = await AsyncStorage.getAllKeys();
        const exerciseKeys = keys.filter(key => key.startsWith('exerciseSets_'));
        await AsyncStorage.multiRemove(exerciseKeys);

        Alert.alert(
          '강제 로그아웃',
          '앱이 종료되어 자동으로 로그아웃되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              }
            }
          ]
        );
      } catch (error) {
        console.error('강제 로그아웃 처리 오류:', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);


    return () => {
      subscription?.remove();
      if (backgroundTimer) clearTimeout(backgroundTimer);
    };
  }, [navigation]);

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
        />
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
            <Text style={{ color: gymTheme.colors.accent, fontWeight: 'bold' }}>
              🔢 총 반복수: {dailyTotalReps}
            </Text>
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
                      (set.weightLocked || (set.memo && set.memo !== '피드백 없음') || selectedDate.toDateString() !== getToday().toDateString()) ? styles.weightInputLocked : null
                    ]}
                    value={set.weight?.toString() ?? ''}
                    onChangeText={txt => handleWeightChange(idx, txt.replace(/[^0-9]/g, '').slice(0,3))}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholder="무게"
                    placeholderTextColor={gymTheme.colors.textMuted}
                    editable={!set.weightLocked && (!set.memo || set.memo === '피드백 없음') && selectedDate.toDateString() === getToday().toDateString()}
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
                  selectedDate.toDateString() === getToday().toDateString() ? (
                    <TouchableOpacity
                      style={[
                        styles.uploadButton,
                        !set.weight || set.weight.trim() === '' ? styles.uploadButtonDisabled : null
                      ]}
                      onPress={() => handleVideoUpload(idx)}
                      disabled={!set.weight || set.weight.trim() === ''}>
                      <View style={[
                        styles.uploadContainer,
                        set.weight && set.weight.trim() !== '' ? styles.uploadActive : styles.uploadInactive
                      ]}>
                        <Text style={styles.uploadIcon}>📹</Text>
                        <Text style={styles.uploadText}>영상 업로드</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.uploadDisabledContainer}>
                      <Text style={styles.uploadDisabledIcon}>📹</Text>
                      <Text style={styles.uploadDisabledText}>오늘만 가능</Text>
                    </View>
                  )
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
                ) : set.memo && set.memo !== '피드백 없음' ? (
                  <TouchableOpacity
                    style={styles.analysisButton}
                    onPress={() => handleGetFeedbackWithVideo(idx)}>
                    <View style={styles.analysisContainer}>
                      <Text style={styles.analysisIcon}>📊</Text>
                      <Text style={styles.analysisText}>분석 영상 보기</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  (() => {
                    const isPastDate = selectedDate.toDateString() !== getToday().toDateString();
                    const hasWeight = set.weight && set.weight.trim() !== '';
                    const hasNoFeedback = !set.memo || set.memo === '피드백 없음';
                    if (isPastDate && hasWeight && hasNoFeedback) {
                      return (
                        <TouchableOpacity
                          style={styles.analysisButton}
                          onPress={() => handleGetFeedbackWithVideo(idx)}>
                          <View style={styles.analysisContainer}>
                            <Text style={styles.analysisIcon}>🔍</Text>
                            <Text style={styles.analysisText}>피드백 영상 확인</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()
                )}
              </View>
            </View>
          ))}

          {/* 세트 추가 - 오늘 날짜에만 표시 */}
          {selectedDate.toDateString() === getToday().toDateString() && (
            <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
              <Text style={styles.addSetText}>+ 세트 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 새로고침 */}
        <TouchableOpacity style={styles.refreshButton} onPress={fetchFeedback}>
          <View style={styles.refreshContainer}>
            <Text style={styles.refreshText}>🔄 {formatDate(selectedDate)} 피드백 새로고침</Text>
          </View>
        </TouchableOpacity>

        {/* 디버깅용 테스트 버튼 */}
        <TouchableOpacity
          style={[styles.refreshButton, { marginTop: 10, backgroundColor: '#FF6B6B' }]}
          onPress={() => {
            if (exerciseSets[selectedExercise][0].weight) {
              handleGetFeedbackWithVideo(0);
            } else {
              Alert.alert('테스트', '먼저 첫 번째 세트에 무게를 입력해주세요.');
            }
          }}
        >
          <View style={styles.refreshContainer}>
            <Text style={styles.refreshText}>🧪 피드백 영상 테스트</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* 날짜 선택 모달 */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>날짜 선택</Text>
            <View style={styles.datePickerContainer}>
              <Picker
                selectedValue={selectedDate.getFullYear()}
                style={[styles.yearPicker, { 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }]}
                itemStyle={{ 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
                onValueChange={(year) => {
                  const newDate = new Date(selectedDate);
                  newDate.setFullYear(year);
                  const today = getToday();
                  // 오늘 날짜보다 크면 선택 불가
                  if (newDate.getFullYear() > today.getFullYear() ||
                      (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() > today.getMonth()) ||
                      (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() === today.getMonth() && newDate.getDate() > today.getDate())) {
                    return;
                  }
                  setSelectedDate(newDate);
                }}
              >
                {Array.from({ length: 10 }, (_, i) => getToday().getFullYear() - 5 + i).map(year => (
                  <Picker.Item key={year} label={String(year)} value={year} color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />
                ))}
              </Picker>
              <Picker
                selectedValue={selectedDate.getMonth() + 1}
                style={[styles.monthPicker, { 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }]}
                itemStyle={{ 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
                onValueChange={(month) => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(month - 1);
                  const today = getToday();
                  // 오늘 날짜보다 크면 선택 불가
                  if (newDate.getFullYear() > today.getFullYear() ||
                      (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() > today.getMonth()) ||
                      (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() === today.getMonth() && newDate.getDate() > today.getDate())) {
                    return;
                  }
                  setSelectedDate(newDate);
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <Picker.Item key={month} label={String(month)} value={month} color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />
                ))}
              </Picker>
              <Picker
                selectedValue={selectedDate.getDate()}
                style={[styles.dayPicker, { 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }]}
                itemStyle={{ 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
                onValueChange={(day) => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(day);
                  const today = getToday();
                  // 오늘 날짜보다 크면 선택 불가
                  if (newDate.getFullYear() > today.getFullYear() ||
                      (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() > today.getMonth()) ||
                      (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() === today.getMonth() && newDate.getDate() > today.getDate())) {
                    return;
                  }
                  setSelectedDate(newDate);
                }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <Picker.Item key={day} label={String(day)} value={day} color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowDatePicker(false)}>
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

      {/* 비디오 플레이어 모달 */}
      <Modal visible={showVideoPlayer} transparent animationType="slide">
        <View style={styles.videoPlayerContainer}>
          <Video
            source={{ uri: videoUri }}
            style={styles.videoPlayer}
            controls={true}
            resizeMode="contain"
            onError={(error) => {
              console.error('비디오 재생 오류:', error);
              Alert.alert('오류', '비디오를 재생할 수 없습니다.');
            }}
            onEnd={() => {
              // 비디오 재생 완료 시 자동으로 모달 닫기
              setShowVideoPlayer(false);
              setVideoUri(null);
            }}
          />
          <TouchableOpacity
            style={styles.videoCloseButton}
            onPress={() => {
              setShowVideoPlayer(false);
              setVideoUri(null);
            }}
          >
            <Text style={styles.videoCloseButtonText}>✕</Text>
          </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  dateArrow: { padding: 10 },
  dateArrowText: { fontSize: 20, color: gymTheme.colors.accent, fontWeight: 'bold' },
  dateSelector: { alignItems: 'center', marginHorizontal: 20 },
  dateText: {
    fontSize: 18, color: gymTheme.colors.text, fontWeight: 'bold', marginBottom: 4,
  },
  dateSelectorText: { fontSize: 12, color: gymTheme.colors.accent },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: gymTheme.colors.text, marginBottom: 10 },

  scrollView: { flex: 1 },
  content: { padding: gymTheme.spacing.lg },

  exerciseCard: {
    backgroundColor: gymTheme.colors.card, borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg, marginBottom: gymTheme.spacing.lg, ...gymTheme.shadows.medium,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: gymTheme.spacing.md },
  exerciseIcon: { fontSize: 24, marginRight: gymTheme.spacing.sm },
  exerciseName: { fontSize: 20, fontWeight: 'bold', color: gymTheme.colors.text },
  pickerContainer: {
    backgroundColor: '#2a2a2a', borderRadius: gymTheme.borderRadius.medium,
    borderWidth: 1, borderColor: gymTheme.colors.border,
  },
  picker: { 
    color: gymTheme.colors.text, 
    backgroundColor: gymTheme.colors.input,
    fontSize: 16,
  },

  setsContainer: { marginBottom: gymTheme.spacing.lg },
  setsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  setsTitle: { fontSize: 18, fontWeight: 'bold', color: gymTheme.colors.text },

  setCard: {
    backgroundColor: gymTheme.colors.card, borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg, marginBottom: gymTheme.spacing.md, ...gymTheme.shadows.medium,
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
  weightInputLocked: {
    backgroundColor: gymTheme.colors.success,
    borderColor: gymTheme.colors.success,
    // 초록색 배경에서 글자가 잘 보이도록 흰색으로 변경합니다.
    color: '#FFFFFF', 
    fontWeight: 'bold',
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

  analysisButton: { borderRadius: gymTheme.borderRadius.medium, overflow: 'hidden' },
  analysisContainer: {
    paddingVertical: gymTheme.spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gymTheme.colors.success, borderRadius: gymTheme.borderRadius.medium,
  },
  analysisIcon: { fontSize: 20, marginBottom: 4 },
  analysisText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 14 },

  uploadingContainer: {
    paddingVertical: gymTheme.spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: gymTheme.colors.warning || '#FFA500', borderRadius: gymTheme.borderRadius.medium,
  },
  uploadingIcon: { fontSize: 20, marginBottom: 4 },
  uploadingText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 14 },

  uploadDisabledContainer: {
    paddingVertical: gymTheme.spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#666666', borderRadius: gymTheme.borderRadius.medium,
  },
  uploadDisabledIcon: { fontSize: 20, marginBottom: 4 },
  uploadDisabledText: { color: gymTheme.colors.textMuted, fontWeight: '600', fontSize: 14 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: gymTheme.colors.card, borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg, width: '90%', maxHeight: '80%', ...gymTheme.shadows.large,
  },
  modalTitle: {
    fontSize: 20, fontWeight: 'bold', color: gymTheme.colors.text, textAlign: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  datePickerContainer: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: gymTheme.spacing.lg,
  },
    yearPicker: { 
    width: 70, 
    height: 100, 
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthPicker: { 
    width: 70, 
    height: 100, 
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayPicker: {
    width: 70, 
    height: 100, 
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  modalButton: {
    backgroundColor: gymTheme.colors.input, paddingHorizontal: gymTheme.spacing.lg,
    paddingVertical: gymTheme.spacing.md, borderRadius: gymTheme.borderRadius.medium,
    minWidth: 100, alignItems: 'center',
  },
  modalButtonConfirm: { backgroundColor: gymTheme.colors.accent },
  modalButtonText: { color: gymTheme.colors.text, fontWeight: '600', fontSize: 16 },
  
  // 비디오 플레이어 관련 스타일
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  videoCloseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

});
