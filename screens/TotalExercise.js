import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, StatusBar, BackHandler } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { UserContext } from './UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';
import { useFocusEffect } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

const SimpleBarChart = ({ data, labels, title, maxValue }) => {
  const safeMaxValue = maxValue === 0 ? 1 : maxValue;
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartContent}>
        {data.map((value, index) => (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barWrapper}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: (value / safeMaxValue) * 120, 
                    backgroundColor: gymTheme.colors.accent 
                  }
                ]} 
              />
            </View>
            <Text style={styles.barLabel}>{labels[index]}</Text>
            <Text style={styles.barValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const SimpleLineChart = ({ data, labels, title }) => {
  const maxValue = Math.max(...data) || 1;
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * (screenWidth - 100),
    y: 120 - (value / maxValue) * 120
  }));

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.lineChartContainer}>
        <View style={styles.lineChartContent}>
          {points.map((point, index) => (
            <View key={index} style={styles.pointContainer}>
              <View style={[styles.point, { left: point.x - 5, top: point.y - 5, backgroundColor: gymTheme.colors.accent }]} />
              {index > 0 && (
                <View 
                  style={[styles.line, {
                    left: points[index - 1].x,
                    top: points[index - 1].y,
                    width: point.x - points[index - 1].x,
                    height: 2,
                    backgroundColor: gymTheme.colors.accent
                  }]} 
                />
              )}
            </View>
          ))}
        </View>
        <View style={styles.lineChartLabels}>
          {labels.map((label, index) => (
            <Text key={index} style={styles.lineChartLabel}>{label}</Text>
          ))}
        </View>
      </View>
    </View>
  );
};

export default function TotalExerciseScreen({ navigation }) {
  const today = new Date();
  const { user, isLoading } = useContext(UserContext);
  const [todaySquatReps, setTodaySquatReps] = useState(0);
  const [todayDeadliftReps, setTodayDeadliftReps] = useState(0);
  const [todayBenchReps, setTodayBenchReps] = useState(0);
  const [period, setPeriod] = useState('day');
  const [selectedExercise, setSelectedExercise] = useState('bench');
  const [todayTotalTime, setTodayTotalTime] = useState(0);
  const [todayKcal, setTodayKcal] = useState({});
  const [weekKcal, setWeekKcal] = useState({});
  const [monthKcal, setMonthKcal] = useState({});

  const [customMode, setCustomMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startYear, setStartYear] = useState(String(today.getFullYear()));
  const [startMonth, setStartMonth] = useState(String(today.getMonth() + 1));
  const [startDay, setStartDay] = useState('1');
  const [endYear, setEndYear] = useState(String(today.getFullYear()));
  const [endMonth, setEndMonth] = useState(String(today.getMonth() + 1));
  const [endDay, setEndDay] = useState(String(today.getDate()));
  const [customKcal, setCustomKcal] = useState({});
  const [exerciseSets, setExerciseSets] = useState({
    day: { bench: { count: 0, time: 0 }, deadlift: { count: 0, time: 0 }, squat: { count: 0, time: 0 } },
    week: { bench: { count: 0, time: 0 }, deadlift: { count: 0, time: 0 }, squat: { count: 0, time: 0 } },
    month: { bench: { count: 0, time: 0 }, deadlift: { count: 0, time: 0 }, squat: { count: 0, time: 0 } },
    custom: { bench: { count: 0, time: 0 }, deadlift: { count: 0, time: 0 }, squat: { count: 0, time: 0 } },
  });
  const [loading, setLoading] = useState(false);

  const exerciseDataMap = exerciseSets;


  // AsyncStorage에서 운동 데이터 불러오기
  const loadExerciseDataFromStorage = async (periodType) => {
    try {
      let startDate, endDate;
      
      if (periodType === 'day') {
        startDate = endDate = getTodayStr();
      } else if (periodType === 'week') {
        const weekRange = getWeekRange();
        startDate = weekRange.start;
        endDate = weekRange.end;
      } else if (periodType === 'month') {
        const monthRange = getMonthRange();
        startDate = monthRange.start;
        endDate = monthRange.end;
      } else if (periodType === 'custom') {
        // custom의 경우 startDate와 endDate가 이미 설정되어 있음
        return;
      }

      if (!startDate || !endDate) return;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const exerciseData = { bench: 0, deadlift: 0, squat: 0 };

      // 날짜 범위 내의 모든 운동 데이터를 수집
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const key = `exerciseSets_${dateStr}`;
        const saved = await AsyncStorage.getItem(key);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.entries(parsed).forEach(([exercise, sets]) => {
            const completedSets = sets.filter(set => set.weight && set.weight.trim() !== '');
            if (exercise === 'bench_press') {
              exerciseData.bench += completedSets.length;
            } else if (exercise === 'deadlift') {
              exerciseData.deadlift += completedSets.length;
            } else if (exercise === 'squat') {
              exerciseData.squat += completedSets.length;
            }
          });
        }
      }

      // exerciseDataMap 업데이트
      setExerciseSets(prev => ({
        ...prev,
        [periodType]: {
          bench: { count: exerciseData.bench, time: exerciseData.bench * 5 },
          deadlift: { count: exerciseData.deadlift, time: exerciseData.deadlift * 5 },
          squat: { count: exerciseData.squat, time: exerciseData.squat * 5 },
        }
      }));



    } catch (e) {
      console.error('운동 데이터 불러오기 실패:', e);
    }
  };

  const exerciseLabels = ['벤치프레스', '데드리프트', '스쿼트'];
  const exerciseKeys = ['bench', 'deadlift', 'squat'];
  
  const getSafeExerciseData = (periodType) => {
    const data = exerciseDataMap[periodType] || exerciseDataMap.day;
    return exerciseKeys.map(key => data[key].count);
  };
  
  const exerciseData = getSafeExerciseData(period);

  const getSafeTimeData = (periodType, exerciseType) => {
    const data = exerciseDataMap[periodType] || exerciseDataMap.day;
    return [data[exerciseType].time];
  };
  
  const timeData = getSafeTimeData(period, selectedExercise);
  const timeLabels = [exerciseLabels[exerciseKeys.indexOf(selectedExercise)]];

  const getSafeTotalTime = (periodType) => {
    if (periodType === 'day') {
      return todayTotalTime;
    }
    const data = exerciseDataMap[periodType] || exerciseDataMap.day;
    return Object.values(data).reduce((sum, v) => sum + v.time, 0);
  };
  
  const totalTime = getSafeTotalTime(period);
  const timeDataAll = [totalTime];
  const timeLabelsAll = ['전체'];

  function getTodayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const toStr = d => d.toISOString().slice(0, 10);
    return { start: toStr(monday), end: toStr(sunday) };
  }
  function getMonthRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const toStr = d => d.toISOString().slice(0, 10);
    return { start: toStr(first), end: toStr(last) };
  }

  // 날짜 범위를 표시하는 함수
  function getDateRangeText(periodType) {
    if (periodType === 'day') {
      const today = new Date();
      return `(${today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })})`;
    } else if (periodType === 'week') {
      const weekRange = getWeekRange();
      const startDate = new Date(weekRange.start);
      const endDate = new Date(weekRange.end);
      return `(${startDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ ${endDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })})`;
    } else if (periodType === 'month') {
      const monthRange = getMonthRange();
      const startDate = new Date(monthRange.start);
      return `(${startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })})`;
    } else if (periodType === 'custom') {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `(${start.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ ${end.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })})`;
      }
      return '';
    }
    return '';
  }

  // 운동 횟수 API 호출 함수들
  const fetchTodayReps = async () => {
    try {
      console.log('🔥 fetchTodayReps 시작 - userId:', user.id);
      const types = ['bench', 'squat', 'deadlift'];
      const results = {};
      for (const type of types) {
        const url = `http://13.209.67.129:8000/workouts/users/${user.id}/today/reps?exercise=${type}`;
        console.log(`🔥 ${type} reps API 호출:`, url);
        const response = await fetch(url);
        console.log(`🔥 ${type} reps 응답 상태:`, response.status);
        if (!response.ok) throw new Error(`${type} reps fetch failed: ${response.status}`);
        const data = await response.json();
        console.log(`🔥 ${type} reps 응답 데이터:`, data);
        results[`${type}_reps`] = data.total_reps || 0;
      }
      console.log('🔥 최종 todayReps 결과:', results);
      
      // exerciseSets 업데이트
      setExerciseSets(prev => ({
        ...prev,
        day: {
          bench: { count: results.bench_reps, time: results.bench_reps * 5 },
          deadlift: { count: results.deadlift_reps, time: results.deadlift_reps * 5 },
          squat: { count: results.squat_reps, time: results.squat_reps * 5 },
        }
      }));
    } catch (error) {
      console.error("🔥 Error fetching today reps by type:", error);
    }
  };

  const fetchWeekReps = async () => {
    try {
      console.log('🔥 fetchWeekReps 시작 - userId:', user.id);
      const types = ['bench', 'squat', 'deadlift'];
      const results = {};
      for (const type of types) {
        const url = `http://13.209.67.129:8000/workouts/users/${user.id}/week/${type}-reps`;
        console.log(`🔥 ${type} week reps API 호출:`, url);
        const response = await fetch(url);
        console.log(`🔥 ${type} week reps 응답 상태:`, response.status);
        if (!response.ok) throw new Error(`${type} week reps fetch failed: ${response.status}`);
        const data = await response.json();
        console.log(`🔥 ${type} week reps 응답 데이터:`, data);
        results[`${type}_reps`] = data[`${type}_reps`] || 0;
      }
      console.log('🔥 최종 weekReps 결과:', results);
      
      // exerciseSets 업데이트
      setExerciseSets(prev => ({
        ...prev,
        week: {
          bench: { count: results.bench_reps, time: results.bench_reps * 5 },
          deadlift: { count: results.deadlift_reps, time: results.deadlift_reps * 5 },
          squat: { count: results.squat_reps, time: results.squat_reps * 5 },
        }
      }));
    } catch (error) {
      console.error("🔥 Error fetching week reps by type:", error);
    }
  };

  const fetchMonthReps = async () => {
    try {
      console.log('🔥 fetchMonthReps 시작 - userId:', user.id);
      const types = ['bench', 'squat', 'deadlift'];
      const results = {};
      for (const type of types) {
        const url = `http://13.209.67.129:8000/workouts/users/${user.id}/month/${type}-reps`;
        console.log(`🔥 ${type} month reps API 호출:`, url);
        const response = await fetch(url);
        console.log(`🔥 ${type} month reps 응답 상태:`, response.status);
        if (!response.ok) throw new Error(`${type} month reps fetch failed: ${response.status}`);
        const data = await response.json();
        console.log(`🔥 ${type} month reps 응답 데이터:`, data);
        results[`${type}_reps`] = data[`${type}_reps`] || 0;
      }
      console.log('🔥 최종 monthReps 결과:', results);
      
      // exerciseSets 업데이트
      setExerciseSets(prev => ({
        ...prev,
        month: {
          bench: { count: results.bench_reps, time: results.bench_reps * 5 },
          deadlift: { count: results.deadlift_reps, time: results.deadlift_reps * 5 },
          squat: { count: results.squat_reps, time: results.squat_reps * 5 },
        }
      }));
    } catch (error) {
      console.error("🔥 Error fetching month reps by type:", error);
    }
  };

  const fetchCustomReps = async () => {
    try {
      if (!startDate || !endDate) return;
      console.log('🔥 fetchCustomReps 시작 - userId:', user.id, '기간:', startDate, '~', endDate);
      const types = ['bench', 'squat', 'deadlift'];
      const results = {};
      for (const type of types) {
        const url = `http://13.209.67.129:8000/workouts/users/${user.id}/custom/${startDate}/${endDate}/${type}-reps`;
        console.log(`🔥 ${type} custom reps API 호출:`, url);
        const response = await fetch(url);
        console.log(`🔥 ${type} custom reps 응답 상태:`, response.status);
        if (!response.ok) throw new Error(`${type} custom reps fetch failed: ${response.status}`);
        const data = await response.json();
        console.log(`🔥 ${type} custom reps 응답 데이터:`, data);
        results[`${type}_reps`] = data[`${type}_reps`] || 0;
      }
      console.log('🔥 최종 customReps 결과:', results);
      
      // exerciseSets 업데이트
      setExerciseSets(prev => ({
        ...prev,
        custom: {
          bench: { count: results.bench_reps, time: results.bench_reps * 5 },
          deadlift: { count: results.deadlift_reps, time: results.deadlift_reps * 5 },
          squat: { count: results.squat_reps, time: results.squat_reps * 5 },
        }
      }));
    } catch (error) {
      console.error('🔥 Error fetching custom reps by type:', error);
    }
  };

  // 칼로리 API 호출 함수들
  const fetchTodayKcal = async () => {
    try {
      console.log('🔥 fetchTodayKcal 시작 - userId:', user.id);
      const types = ['bench', 'squat', 'deadlift'];
      const results = {};
      for (const type of types) {
        const url = `http://13.209.67.129:8000/workouts/users/${user.id}/today/${type}-kcal`;
        console.log(`🔥 ${type} kcal API 호출:`, url);
        const response = await fetch(url);
        console.log(`🔥 ${type} kcal 응답 상태:`, response.status);
        if (!response.ok) throw new Error(`${type} kcal fetch failed: ${response.status}`);
        const data = await response.json();
        console.log(`🔥 ${type} kcal 응답 데이터:`, data);
        results[`${type}_kcal`] = data[`${type}_kcal`] || 0;
      }
      console.log('🔥 최종 todayKcal 결과:', results);
      setTodayKcal(results);
    } catch (error) {
      console.error("🔥 Error fetching today kcal by type:", error);
    }
  };

  const fetchWeekKcal = async () => {
    try {
      console.log('🔥 fetchWeekKcal 시작 - userId:', user.id);
      const types = ['bench', 'squat', 'deadlift'];
      const results = {};
      for (const type of types) {
        const url = `http://13.209.67.129:8000/workouts/users/${user.id}/week/${type}-kcal`;
        console.log(`🔥 ${type} week kcal API 호출:`, url);
        const response = await fetch(url);
        console.log(`🔥 ${type} week kcal 응답 상태:`, response.status);
        if (!response.ok) throw new Error(`${type} week kcal fetch failed: ${response.status}`);
        const data = await response.json();
        console.log(`🔥 ${type} week kcal 응답 데이터:`, data);
        results[`${type}_kcal`] = data[`${type}_kcal`] || 0;
      }
      console.log('🔥 최종 weekKcal 결과:', results);
      setWeekKcal(results);
    } catch (error) {
      console.error("🔥 Error fetching week kcal by type:", error);
    }
  };

  const fetchMonthKcal = async () => {
    try {
      console.log('🔥 fetchMonthKcal 시작 - userId:', user.id);
      const types = ['bench', 'squat', 'deadlift'];
      const results = {};
      for (const type of types) {
        const url = `http://13.209.67.129:8000/workouts/users/${user.id}/month/${type}-kcal`;
        console.log(`🔥 ${type} month kcal API 호출:`, url);
        const response = await fetch(url);
        console.log(`🔥 ${type} month kcal 응답 상태:`, response.status);
        if (!response.ok) throw new Error(`${type} month kcal fetch failed: ${response.status}`);
        const data = await response.json();
        console.log(`🔥 ${type} month kcal 응답 데이터:`, data);
        results[`${type}_kcal`] = data[`${type}_kcal`] || 0;
      }
      console.log('🔥 최종 monthKcal 결과:', results);
      setMonthKcal(results);
    } catch (error) {
      console.error("🔥 Error fetching month kcal by type:", error);
    }
  };

  const handlePeriod = (type) => {
    setPeriod(type);
    setCustomMode(false);
    if (type === 'day') {
      const t = getTodayStr();
      setStartDate(t);
      setEndDate(t);
      console.log('오늘:', t, '~', t);
      loadExerciseDataFromStorage('day');
      // 오늘 운동 횟수와 칼로리 API 호출
      fetchTodayReps();
      fetchTodayKcal();
    } else if (type === 'week') {
      const r = getWeekRange();
      setStartDate(r.start);
      setEndDate(r.end);
      console.log('주간:', r.start, '~', r.end);
      loadExerciseDataFromStorage('week');
      // 주간 운동 횟수와 칼로리 API 호출
      fetchWeekReps();
      fetchWeekKcal();
    } else if (type === 'month') {
      const r = getMonthRange();
      setStartDate(r.start);
      setEndDate(r.end);
      console.log('이번달:', r.start, '~', r.end);
      loadExerciseDataFromStorage('month');
      // 이번달 운동 횟수와 칼로리 API 호출
      fetchMonthReps();
      fetchMonthKcal();
    }
  };

  useEffect(() => {
    if (user?.id) {
      // 기간별 운동 횟수와 칼로리 데이터 가져오기
      if (period === 'day') {
        fetchTodayReps();
        fetchTodayKcal();
      } else if (period === 'week') {
        fetchWeekReps();
        fetchWeekKcal();
      } else if (period === 'month') {
        fetchMonthReps();
        fetchMonthKcal();
      } else if (period === 'custom') {
        fetchCustomReps();
        fetchCustomKcal();
      }
    }
    
    // AsyncStorage에서 운동 데이터 불러오기
    loadExerciseDataFromStorage('day');
    loadExerciseDataFromStorage('week');
    loadExerciseDataFromStorage('month');
  }, [user?.id, period]);


  // today 데이터를 exerciseSets에 반영하는 useEffect
  useEffect(() => {
    setExerciseSets(prev => ({
      ...prev,
      day: {
        bench: { count: todayBenchReps, time: todayBenchReps * 5 },
        deadlift: { count: todayDeadliftReps, time: todayDeadliftReps * 5 },
        squat: { count: todaySquatReps, time: todaySquatReps * 5 },
      }
    }));

    const setTodayTime = async () => {
      const checkInTimeStr = await AsyncStorage.getItem('checkInTime');
      if (checkInTimeStr) {
        const checkInTime = new Date(checkInTimeStr);
        const now = new Date();
        const diffMs = now - checkInTime;
        const diffMin = Math.floor(diffMs / 60000);
        setTodayTotalTime(diffMin);
      } else {
        setTodayTotalTime(0);
      }
    };
    setTodayTime();
  }, [user?.id, todayBenchReps, todayDeadliftReps, todaySquatReps]);



  const renderExerciseTabs = () => (
    <View style={styles.exerciseTabs}>
      {exerciseKeys.map((key, idx) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.exerciseTab,
            selectedExercise === key ? styles.exerciseTabActive : null
          ]}
          onPress={() => setSelectedExercise(key)}
        >
          <Text style={[
            styles.exerciseTabText,
            selectedExercise === key ? styles.exerciseTabTextActive : null
          ]}>
            {exerciseLabels[idx]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const exerciseDataAll = getSafeExerciseData(period);

  const handleCustomApply = () => {
    const s = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
    const e = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
    setStartDate(s);
    setEndDate(e);
    setCustomMode(false);
    setPeriod('custom');
    console.log('직접입력:', s, '~', e);
    loadExerciseDataFromStorage('custom');
    // custom 기간 칼로리 API 호출은 useEffect에서 자동으로 처리됨
  };

  useEffect(() => {
    const fetchCustomKcal = async () => {
      if (period !== 'custom' || !startDate || !endDate || !user?.id) return;
      try {
        console.log('🔥 fetchCustomKcal 시작 - userId:', user.id, '기간:', startDate, '~', endDate);
        const types = ['bench', 'squat', 'deadlift'];
        const results = {};
        for (const type of types) {
          const url = `http://13.209.67.129:8000/workouts/users/${user.id}/custom/${startDate}/${endDate}/${type}-kcal`;
          console.log(`🔥 ${type} custom kcal API 호출:`, url);
          const response = await fetch(url);
          console.log(`🔥 ${type} custom kcal 응답 상태:`, response.status);
          if (!response.ok) throw new Error(`${type} custom kcal fetch failed: ${response.status}`);
          const data = await response.json();
          console.log(`🔥 ${type} custom kcal 응답 데이터:`, data);
          results[`${type}_kcal`] = data[`${type}_kcal`] || 0;
        }
        console.log('🔥 최종 customKcal 결과:', results);
        setCustomKcal(results);
        
        // custom 기간의 운동 데이터도 불러오기
        loadCustomExerciseData();
      } catch (error) {
        console.error('🔥 Error fetching custom kcal by type:', error);
      }
    };
    fetchCustomKcal();
  }, [period, startDate, endDate, user?.id]);

  // 직접입력 기간이 변경될 때 운동 횟수와 칼로리 다시 가져오기
  useEffect(() => {
    if (period === 'custom' && user?.id) {
      const startDate = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
      const endDate = `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
      setStartDate(startDate);
      setEndDate(endDate);
      // custom 기간의 운동 횟수와 칼로리 가져오기
      fetchCustomReps();
      fetchCustomKcal();
    }
  }, [startYear, startMonth, startDay, endYear, endMonth, endDay, user?.id, period]);

  // 하드웨어 백 버튼 핸들러
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Profile 화면으로 이동
        navigation.navigate('Profile');
        return true; // 기본 백 동작 방지
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [navigation])
  );

  // custom 기간의 운동 데이터 불러오기
  const loadCustomExerciseData = async () => {
    try {
      if (!startDate || !endDate) return;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const exerciseData = { bench: 0, deadlift: 0, squat: 0 };

      // 날짜 범위 내의 모든 운동 데이터를 수집
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const key = `exerciseSets_${dateStr}`;
        const saved = await AsyncStorage.getItem(key);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.entries(parsed).forEach(([exercise, sets]) => {
            const completedSets = sets.filter(set => set.weight && set.weight.trim() !== '');
            if (exercise === 'bench_press') {
              exerciseData.bench += completedSets.length;
            } else if (exercise === 'deadlift') {
              exerciseData.deadlift += completedSets.length;
            } else if (exercise === 'squat') {
              exerciseData.squat += completedSets.length;
            }
          });
        }
      }

      // exerciseSets 업데이트
      setExerciseSets(prev => ({
        ...prev,
        custom: {
          bench: { count: exerciseData.bench, time: exerciseData.bench * 5 },
          deadlift: { count: exerciseData.deadlift, time: exerciseData.deadlift * 5 },
          squat: { count: exerciseData.squat, time: exerciseData.squat * 5 },
        }
      }));



    } catch (e) {
      console.error('custom 운동 데이터 불러오기 실패:', e);
    }
  };

  // 로딩 중이거나 사용자 정보가 없을 때
  if (isLoading || !user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
        <CommonHeader 
          navigation={navigation}
          title="운동 기록 분석"
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      {/* 공통 헤더 */}
      <CommonHeader 
        navigation={navigation}
        title="운동 기록 분석"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 기간 선택 탭 */}
        <View style={styles.periodTabs}>
          <TouchableOpacity 
            onPress={() => handlePeriod('day')} 
            style={[
              styles.periodTab,
              period === 'day' && !customMode ? styles.periodTabActive : null
            ]}
          >
            <Text style={[
              styles.periodTabText,
              period === 'day' && !customMode ? styles.periodTabTextActive : null
            ]}>오늘</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handlePeriod('week')} 
            style={[
              styles.periodTab,
              period === 'week' && !customMode ? styles.periodTabActive : null
            ]}
          >
            <Text style={[
              styles.periodTabText,
              period === 'week' && !customMode ? styles.periodTabTextActive : null
            ]}>주간</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handlePeriod('month')} 
            style={[
              styles.periodTab,
              period === 'month' && !customMode ? styles.periodTabActive : null
            ]}
          >
            <Text style={[
              styles.periodTabText,
              period === 'month' && !customMode ? styles.periodTabTextActive : null
            ]}>이번달</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => { setCustomMode(true); setPeriod('custom'); }} 
            style={[
              styles.periodTab,
              customMode ? styles.periodTabActive : null
            ]}
          >
            <Text style={[
              styles.periodTabText,
              customMode ? styles.periodTabTextActive : null
            ]}>직접입력</Text>
          </TouchableOpacity>
        </View>

        {/* 직접입력 모드 */}
        {customMode && (
          <View style={styles.customContainer}>
            <Text style={styles.customTitle}>기간 선택</Text>
            
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>시작일</Text>
              <View style={styles.datePickers}>
                <View style={styles.pickerGroup}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.selectedValue}>{startYear}</Text>
                                        <Picker 
                      selectedValue={startYear} 
                      mode="dropdown"
                      style={[styles.datePicker, { 
                      color: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      borderWidth: 2,
                      borderColor: '#000000',
                      borderRadius: 8
                    }]}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      height: 50
                    }}
                      onValueChange={setStartYear}
                    >
                      {Array.from({ length: 10 }, (_, i) => String(today.getFullYear() - 5 + i)).map(y => (
                        <Picker.Item key={y} label={y} value={y} color="#000000" style={{color: '#000000', fontSize: 18, fontWeight: '900', backgroundColor: '#ffffff'}} />
                      ))}
                    </Picker>
                  </View>
                  <Text style={styles.pickerLabel}>년</Text>
                </View>
                <View style={styles.pickerGroup}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.selectedValue}>{startMonth}</Text>
                    <Picker 
                      selectedValue={startMonth} 
                      mode="dropdown"
                      style={[styles.datePicker, { 
                      color: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      borderWidth: 2,
                      borderColor: '#000000',
                      borderRadius: 8
                    }]}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      height: 50
                    }}
                      onValueChange={setStartMonth}
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(m => (
                        <Picker.Item key={m} label={m} value={m} color="#000000" style={{color: '#000000', fontSize: 18, fontWeight: '900', backgroundColor: '#ffffff'}} />
                      ))}
                    </Picker>
                  </View>
                  <Text style={styles.pickerLabel}>월</Text>
                </View>
                <View style={styles.pickerGroup}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.selectedValue}>{startDay}</Text>
                    <Picker 
                      selectedValue={startDay} 
                      mode="dropdown"
                      style={[styles.datePicker, { 
                      color: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      borderWidth: 2,
                      borderColor: '#000000',
                      borderRadius: 8
                    }]}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      height: 50
                    }}
                      onValueChange={setStartDay}
                    >
                      {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => (
                        <Picker.Item key={d} label={d} value={d} color="#000000" style={{color: '#000000', fontSize: 18, fontWeight: '900', backgroundColor: '#ffffff'}} />
                      ))}
                    </Picker>
                  </View>
                  <Text style={styles.pickerLabel}>일</Text>
                </View>
              </View>
            </View>

            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>종료일</Text>
              <View style={styles.datePickers}>
                <View style={styles.pickerGroup}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.selectedValue}>{endYear}</Text>
                    <Picker 
                      selectedValue={endYear} 
                      mode="dropdown"
                      style={[styles.datePicker, { 
                      color: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      borderWidth: 2,
                      borderColor: '#000000',
                      borderRadius: 8
                    }]}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      height: 50
                    }}
                      onValueChange={setEndYear}
                    >
                      {Array.from({ length: 10 }, (_, i) => String(today.getFullYear() - 5 + i)).map(y => (
                        <Picker.Item key={y} label={y} value={y} color="#000000" style={{color: '#000000', fontSize: 18, fontWeight: '900', backgroundColor: '#ffffff'}} />
                      ))}
                    </Picker>
                  </View>
                  <Text style={styles.pickerLabel}>년</Text>
                </View>
                <View style={styles.pickerGroup}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.selectedValue}>{endMonth}</Text>
                    <Picker 
                      selectedValue={endMonth} 
                      mode="dropdown"
                      style={[styles.datePicker, { 
                      color: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      borderWidth: 2,
                      borderColor: '#000000',
                      borderRadius: 8
                    }]}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      height: 50
                    }}
                      onValueChange={setEndMonth}
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(m => (
                        <Picker.Item key={m} label={m} value={m} color="#000000" style={{color: '#000000', fontSize: 18, fontWeight: '900', backgroundColor: '#ffffff'}} />
                      ))}
                    </Picker>
                  </View>
                  <Text style={styles.pickerLabel}>월</Text>
                </View>
                <View style={styles.pickerGroup}>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.selectedValue}>{endDay}</Text>
                    <Picker 
                      selectedValue={endDay} 
                      mode="dropdown"
                      style={[styles.datePicker, { 
                      color: 'transparent', 
                      backgroundColor: 'transparent',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      borderWidth: 2,
                      borderColor: '#000000',
                      borderRadius: 8
                    }]}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'center',
                      height: 50
                    }}
                      onValueChange={setEndDay}
                    >
                      {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => (
                        <Picker.Item key={d} label={d} value={d} color="#000000" style={{color: '#000000', fontSize: 18, fontWeight: '900', backgroundColor: '#ffffff'}} />
                      ))}
                    </Picker>
                  </View>
                  <Text style={styles.pickerLabel}>일</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.applyButton} onPress={handleCustomApply}>
              <Text style={styles.applyButtonText}>적용</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 선택된 기간 표시 */}
        {period === 'custom' && !customMode && (
          <View style={styles.selectedPeriodCard}>
            <Text style={styles.selectedPeriodTitle}>
              {startDate} ~ {endDate}
            </Text>
            <Text style={styles.selectedPeriodSubtitle}>
              선택한 기간의 운동 데이터
            </Text>
          </View>
        )}

        {/* 선택된 기간 운동 요약 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>
            {period === 'day' ? '오늘의' : period === 'week' ? '주간' : period === 'month' ? '이번달' : '선택기간'} 운동 요약 {getDateRangeText(period)}
            {loading && <Text style={styles.loadingText}> (로딩 중...)</Text>}
          </Text>
          <View style={styles.summaryItems}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemIcon}>🏋️</Text>
              <Text style={styles.summaryItemText}>
                벤치프레스: {loading ? '...' : (exerciseDataMap[period]?.bench?.count || 0)}회
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemIcon}>🦵</Text>
              <Text style={styles.summaryItemText}>
                스쿼트: {loading ? '...' : (exerciseDataMap[period]?.squat?.count || 0)}회
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemIcon}>💪</Text>
              <Text style={styles.summaryItemText}>
                데드리프트: {loading ? '...' : (exerciseDataMap[period]?.deadlift?.count || 0)}회
              </Text>
            </View>
          </View>
        </View>

        {/* 운동 시간 차트 */}
        <SimpleBarChart 
          data={timeDataAll} 
          labels={timeLabelsAll} 
          title={`운동 시간 (${period === 'day' ? '오늘' : period === 'week' ? '주간' : period === 'month' ? '이번달' : '선택기간'} ${getDateRangeText(period)} / 분)`} 
          maxValue={Math.max(...timeDataAll) || 1} 
        />

        {/* 운동별 총 횟수 차트 */}
        <SimpleBarChart 
          data={exerciseDataAll} 
          labels={exerciseLabels} 
          title={`운동별 총 횟수 (${period === 'day' ? '오늘' : period === 'week' ? '주간' : period === 'month' ? '이번달' : '선택기간'} ${getDateRangeText(period)})`} 
          maxValue={Math.max(...exerciseDataAll) || 1} 
        />

        {/* 운동별 칼로리 요약 */}
        {(period === 'day' || period === 'week' || period === 'month' || period === 'custom') && (
          <View style={styles.calorieCard}>
            <Text style={styles.calorieCardTitle}>
              운동별 칼로리 ({period === 'day' ? '오늘' : period === 'week' ? '주간' : period === 'month' ? '이번달' : '선택기간'} {getDateRangeText(period)})
            </Text>

            {exerciseKeys.map((key, idx) => {
              let kcalData;
              if (period === 'day') {
                kcalData = todayKcal[`${key}_kcal`] || 0;
              } else if (period === 'week') {
                kcalData = weekKcal[`${key}_kcal`] || 0;
              } else if (period === 'month') {
                kcalData = monthKcal[`${key}_kcal`] || 0;
              } else if (period === 'custom') {
                kcalData = customKcal[`${key}_kcal`] || 0;
              }
              return (
                <View key={key} style={styles.calorieItem}>
                  <Text style={styles.calorieItemIcon}>
                    {idx === 0 ? '🏋️' : idx === 1 ? '💪' : '🦵'}
                  </Text>
                  <Text style={styles.calorieItemText}>
                    {exerciseLabels[idx]}: {kcalData} kcal
                  </Text>
                </View>
              );
            })}
          </View>
        )}
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
    paddingBottom: 30,
    paddingHorizontal: gymTheme.spacing.lg,
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 8,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  scrollView: {
    flex: 1,
  },
  
  content: {
    padding: gymTheme.spacing.lg,
  },
  
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.medium,
    padding: gymTheme.spacing.sm,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  periodTab: {
    flex: 1,
    paddingVertical: gymTheme.spacing.sm,
    paddingHorizontal: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.small,
    alignItems: 'center',
  },
  
  periodTabActive: {
    backgroundColor: gymTheme.colors.accent,
  },
  
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: gymTheme.colors.textSecondary,
  },
  
  periodTabTextActive: {
    color: gymTheme.colors.text,
  },
  
  customContainer: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  customTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.lg,
    textAlign: 'center',
  },
  
  dateSection: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.sm,
  },
  
  datePickers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  pickerGroup: {
    alignItems: 'center',
    flex: 1,
  },
  
  pickerContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  
  selectedValue: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    zIndex: 100,
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  
  datePicker: {
    width: 70,
    height: 40,
    backgroundColor: 'transparent',
    color: 'transparent',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    includeFontPadding: false,
  },
  
  pickerLabel: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginTop: 4,
  },
  
  applyButton: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.medium,
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
    marginTop: gymTheme.spacing.lg,
  },
  
  applyButtonText: {
    color: gymTheme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  selectedPeriodCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: gymTheme.colors.accent,
    ...gymTheme.shadows.medium,
  },
  
  selectedPeriodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    marginBottom: 4,
  },
  
  selectedPeriodSubtitle: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  summaryCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.md,
  },
  
  summaryItems: {
    gap: gymTheme.spacing.md,
  },
  
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  summaryItemIcon: {
    fontSize: 20,
    marginRight: gymTheme.spacing.sm,
  },
  
  summaryItemText: {
    fontSize: 16,
    color: gymTheme.colors.text,
  },
  
  chartContainer: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: gymTheme.spacing.md,
  },
  
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  
  barWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: gymTheme.spacing.sm,
  },
  
  bar: {
    width: 30,
    borderRadius: gymTheme.borderRadius.small,
    minHeight: 4,
  },
  
  barLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: gymTheme.colors.textSecondary,
    marginBottom: 4,
  },
  
  barValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
  },
  
  lineChartContainer: {
    height: 150,
    position: 'relative',
  },
  
  lineChartContent: {
    flex: 1,
    position: 'relative',
  },
  
  pointContainer: {
    position: 'absolute',
    width: 10,
    height: 10,
  },
  
  point: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
  },
  
  line: {
    position: 'absolute',
  },
  
  lineChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: gymTheme.spacing.md,
    marginTop: gymTheme.spacing.md,
  },
  
  lineChartLabel: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
  },
  
  exerciseTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  
  exerciseTab: {
    backgroundColor: gymTheme.colors.card,
    padding: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.medium,
    marginHorizontal: 4,
  },
  
  exerciseTabActive: {
    backgroundColor: gymTheme.colors.accent,
  },
  
  exerciseTabText: {
    color: gymTheme.colors.textSecondary,
    fontWeight: 'bold',
  },
  
  exerciseTabTextActive: {
    color: gymTheme.colors.text,
  },
  
  calorieCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginTop: gymTheme.spacing.md,
    ...gymTheme.shadows.medium,
  },
  
  calorieCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.md,
  },
  
  calorieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.sm,
  },
  
  calorieItemIcon: {
    fontSize: 20,
    marginRight: gymTheme.spacing.sm,
  },
  
  calorieItemText: {
    fontSize: 16,
    color: gymTheme.colors.text,
  },
  
  debugText: {
    fontSize: 12,
    color: gymTheme.colors.textMuted,
    backgroundColor: gymTheme.colors.card,
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  
  loadingText: {
    fontSize: 12,
    color: gymTheme.colors.accent,
    fontStyle: 'italic',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: gymTheme.colors.primary,
  },
});