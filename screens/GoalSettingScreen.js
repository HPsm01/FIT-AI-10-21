import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from './UserContext';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';
// import { ProgressCircle } from 'react-native-progress'; // Expo에서 네이티브 모듈 문제로 제거
import LinearGradient from 'react-native-linear-gradient';

// 편집 모달 컴포넌트 - 외부로 분리
const EditModalComponent = React.memo(({ visible, type, currentValue, onClose, onSave }) => {
  const [inputValue, setInputValue] = useState('');
  
  useEffect(() => {
    if (visible) {
      setInputValue(currentValue.toString());
    }
  }, [visible, currentValue]);
  
  if (!visible) {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={gymTheme.gradients.card}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>목표 설정</Text>
            <Text style={styles.modalSubtitle}>
              {type.includes('daily') ? '일일' : type.includes('weekly') ? '주간' : '월간'} 목표를 설정하세요
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="목표값 입력"
              placeholderTextColor={gymTheme.colors.textMuted}
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={() => onSave(inputValue)}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
});

export default function GoalSettingScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const [goals, setGoals] = useState({
    // 스쿼트 목표
    dailySquats: 0,
    weeklySquats: 0,
    monthlySquats: 0,
    
    // 벤치프레스 목표
    dailyBench: 0,
    weeklyBench: 0,
    monthlyBench: 0,
    
    // 데드리프트 목표
    dailyDeadlift: 0,
    weeklyDeadlift: 0,
    monthlyDeadlift: 0,
    
    // 운동 시간 목표
    dailyTime: 0, // 분 단위
    weeklyTime: 0, // 분 단위
    monthlyTime: 0, // 분 단위
    
    // 칼로리 목표
    dailyCalories: 0, // 칼로리 단위
    weeklyCalories: 0, // 칼로리 단위
    monthlyCalories: 0, // 칼로리 단위
  });
  const [currentProgress, setCurrentProgress] = useState({
    // 스쿼트 진행률
    dailySquats: 0,
    weeklySquats: 0,
    monthlySquats: 0,
    
    // 벤치프레스 진행률
    dailyBench: 0,
    weeklyBench: 0,
    monthlyBench: 0,
    
    // 데드리프트 진행률
    dailyDeadlift: 0,
    weeklyDeadlift: 0,
    monthlyDeadlift: 0,
    
    // 운동 시간 진행률
    dailyTime: 0,
    weeklyTime: 0,
    monthlyTime: 0,
    
    // 칼로리 진행률
    dailyCalories: 0,
    weeklyCalories: 0,
    monthlyCalories: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' 또는 'detailed'
  const [editModal, setEditModal] = useState({ visible: false, type: '', currentValue: 0 });

  useEffect(() => {
    loadGoals();
    loadCurrentProgress();
  }, []);

  const loadGoals = async () => {
    try {
      const savedGoals = await AsyncStorage.getItem(`goals_${user?.id}`);
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('목표 불러오기 실패:', error);
    }
  };

  const loadCurrentProgress = async () => {
    try {
      // 실제 운동 데이터를 불러와서 현재 진행률 계산
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // 서버에서 운동 데이터 가져오기
      const response = await fetch(`http://13.209.67.129:8000/exercises/user/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        
        // 오늘 데이터
        const todayData = data.filter(item => item.date === today);
        const todaySquats = todayData.reduce((sum, item) => sum + (item.squat_count || 0), 0);
        const todayTime = todayData.reduce((sum, item) => sum + (item.duration || 0), 0);

        // 이번 주 데이터
        const weekData = data.filter(item => item.date >= weekStartStr);
        const weekSquats = weekData.reduce((sum, item) => sum + (item.squat_count || 0), 0);
        const weekTime = weekData.reduce((sum, item) => sum + (item.duration || 0), 0);

        // 이번 달 데이터
        const monthData = data.filter(item => item.date >= monthStartStr);
        const monthSquats = monthData.reduce((sum, item) => sum + (item.squat_count || 0), 0);
        const monthTime = monthData.reduce((sum, item) => sum + (item.duration || 0), 0);

        setCurrentProgress({
          dailySquats: todaySquats,
          weeklySquats: weekSquats,
          monthlySquats: monthSquats,
          dailyTime: Math.round(todayTime / 60), // 초를 분으로 변환
          weeklyTime: Math.round(weekTime / 60),
          monthlyTime: Math.round(monthTime / 60),
        });
      }
    } catch (error) {
      console.error('진행률 불러오기 실패:', error);
    }
  };

  const saveGoals = async () => {
    try {
      await AsyncStorage.setItem(`goals_${user?.id}`, JSON.stringify(goals));
      Alert.alert('성공', '목표가 저장되었습니다!');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('오류', '목표 저장에 실패했습니다.');
    }
  };

  const calculateProgress = (current, goal) => {
    if (goal === 0) return 0;
    return Math.min(current / goal, 1);
  };

  const getProgressColor = (progress) => {
    if (progress >= 1) return gymTheme.colors.success;
    if (progress >= 0.7) return gymTheme.colors.warning;
    return gymTheme.colors.error;
  };

  // 빠른 설정 프리셋
  const quickPresets = {
    beginner: {
      dailySquats: 50,
      weeklySquats: 300,
      monthlySquats: 1200,
      dailyBench: 30,
      weeklyBench: 180,
      monthlyBench: 720,
      dailyDeadlift: 30,
      weeklyDeadlift: 180,
      monthlyDeadlift: 720,
      dailyTime: 30,
      weeklyTime: 180,
      monthlyTime: 720,
      dailyCalories: 200,
      weeklyCalories: 1200,
      monthlyCalories: 4800,
    },
    intermediate: {
      dailySquats: 100,
      weeklySquats: 600,
      monthlySquats: 2400,
      dailyBench: 60,
      weeklyBench: 360,
      monthlyBench: 1440,
      dailyDeadlift: 60,
      weeklyDeadlift: 360,
      monthlyDeadlift: 1440,
      dailyTime: 45,
      weeklyTime: 270,
      monthlyTime: 1080,
      dailyCalories: 350,
      weeklyCalories: 2100,
      monthlyCalories: 8400,
    },
    advanced: {
      dailySquats: 200,
      weeklySquats: 1200,
      monthlySquats: 4800,
      dailyBench: 120,
      weeklyBench: 720,
      monthlyBench: 2880,
      dailyDeadlift: 120,
      weeklyDeadlift: 720,
      monthlyDeadlift: 2880,
      dailyTime: 60,
      weeklyTime: 360,
      monthlyTime: 1440,
      dailyCalories: 500,
      weeklyCalories: 3000,
      monthlyCalories: 12000,
    }
  };

  const applyQuickPreset = (preset) => {
    setGoals(quickPresets[preset]);
    Alert.alert('적용 완료', `${preset === 'beginner' ? '초급자' : preset === 'intermediate' ? '중급자' : '고급자'} 목표가 설정되었습니다!`);
  };

  // 편집 모달 열기
  const openEditModal = useCallback((type, currentValue) => {
    setEditModal({ visible: true, type, currentValue });
  }, []);

  // 편집 모달 닫기
  const closeEditModal = useCallback(() => {
    setEditModal({ visible: false, type: '', currentValue: 0 });
  }, []);

  // 목표 값 저장
  const saveGoal = useCallback((newValue) => {
    if (newValue && !isNaN(newValue)) {
      const numValue = parseInt(newValue);
      setGoals(prev => ({ ...prev, [editModal.type]: numValue }));
      setEditModal({ visible: false, type: '', currentValue: 0 });
    }
  }, [editModal.type]);


  // 대시보드 뷰 컴포넌트
  const DashboardView = React.memo(() => {
    const overallProgress = Math.round((
      calculateProgress(currentProgress.weeklySquats, goals.weeklySquats) +
      calculateProgress(currentProgress.weeklyBench, goals.weeklyBench) +
      calculateProgress(currentProgress.weeklyDeadlift, goals.weeklyDeadlift) +
      calculateProgress(currentProgress.weeklyTime, goals.weeklyTime) +
      calculateProgress(currentProgress.weeklyCalories, goals.weeklyCalories)
    ) / 5 * 100);

    const getMotivationalMessage = () => {
      if (overallProgress >= 100) return "🎉 완벽한 주간이었습니다!";
      if (overallProgress >= 80) return "💪 거의 다 왔어요! 화이팅!";
      if (overallProgress >= 60) return "🔥 좋은 페이스입니다!";
      if (overallProgress >= 40) return "⚡ 조금만 더 힘내세요!";
      if (overallProgress >= 20) return "🌱 천천히 꾸준히 해보세요!";
      return "🚀 시작이 반입니다! 함께 해봐요!";
    };

    return (
      <View style={styles.dashboardContainer}>
        {/* 헤더 섹션 */}
        <LinearGradient
          colors={gymTheme.gradients.accent}
          style={styles.dashboardHeader}
        >
          <Text style={styles.dashboardTitle}>🎯 운동 목표 대시보드</Text>
          <Text style={styles.dashboardSubtitle}>박승민님의 피트니스 여정</Text>
          <Text style={styles.motivationalMessage}>{getMotivationalMessage()}</Text>
        </LinearGradient>

        {/* 전체 진행률 카드 */}
        <View style={styles.overallProgressCard}>
          <LinearGradient
            colors={overallProgress >= 80 ? ['#06ffa5', '#00d4ff'] : overallProgress >= 50 ? ['#00d4ff', '#ff006e'] : ['#ff3366', '#ff006e']}
            style={styles.overallGradient}
          >
            <View style={styles.overallContent}>
              <Text style={styles.overallLabel}>이번 주 목표 달성률</Text>
              <Text style={styles.overallValue}>{overallProgress}%</Text>
              <View style={styles.overallProgressBar}>
                <View style={[styles.overallProgressFill, { width: `${overallProgress}%` }]} />
              </View>
              <Text style={styles.overallSubtext}>
                {overallProgress >= 100 ? "목표 완료!" : `${100 - overallProgress}% 더 달성하세요!`}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* 오늘의 목표 - 고급 카드 */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionHeader}>📅 오늘의 목표</Text>
          <View style={styles.advancedGrid}>
            {[
              { key: 'squats', icon: '🏋️', label: '스쿼트', current: currentProgress.dailySquats, goal: goals.dailySquats, unit: '회', color: '#00d4ff' },
              { key: 'bench', icon: '💪', label: '벤치프레스', current: currentProgress.dailyBench, goal: goals.dailyBench, unit: '회', color: '#ff006e' },
              { key: 'deadlift', icon: '🔥', label: '데드리프트', current: currentProgress.dailyDeadlift, goal: goals.dailyDeadlift, unit: '회', color: '#06ffa5' },
              { key: 'time', icon: '⏰', label: '운동시간', current: currentProgress.dailyTime, goal: goals.dailyTime, unit: '분', color: '#ffa500' },
              { key: 'calories', icon: '🔥', label: '칼로리', current: currentProgress.dailyCalories, goal: goals.dailyCalories, unit: 'kcal', color: '#ff3366' }
            ].map((exercise, index) => {
              const progress = calculateProgress(exercise.current, exercise.goal);
              const percentage = Math.round(progress * 100);
              
              return (
                <TouchableOpacity 
                  key={exercise.key} 
                  style={styles.advancedCard}
                  onPress={() => {
                    let goalType = '';
                    if (exercise.key === 'squats') goalType = 'dailySquats';
                    else if (exercise.key === 'bench') goalType = 'dailyBench';
                    else if (exercise.key === 'deadlift') goalType = 'dailyDeadlift';
                    else if (exercise.key === 'time') goalType = 'dailyTime';
                    else if (exercise.key === 'calories') goalType = 'dailyCalories';
                    
                    openEditModal(goalType, exercise.goal);
                  }}
                >
                  <LinearGradient
                    colors={[exercise.color + '20', exercise.color + '10']}
                    style={styles.advancedCardGradient}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardIcon}>{exercise.icon}</Text>
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>{exercise.label}</Text>
                        <View style={styles.cardHeaderRight}>
                          <Text style={styles.cardPercentage}>{percentage}%</Text>
                          <Text style={styles.editHint}>터치하여 편집</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.cardContent}>
                      <Text style={styles.cardValue}>
                        {exercise.current}{exercise.unit} / {exercise.goal}{exercise.unit}
                      </Text>
                      <View style={styles.cardProgressContainer}>
                        <View style={styles.cardProgressBar}>
                          <View style={[styles.cardProgressFill, { 
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: exercise.color
                          }]} />
                        </View>
                      </View>
                      <Text style={styles.cardRemaining}>
                        {Math.max(0, exercise.goal - exercise.current)}{exercise.unit} 남음
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 빠른 목표 설정 */}
        <View style={styles.quickSettingsSection}>
          <Text style={styles.sectionHeader}>🚀 빠른 목표 설정</Text>
          <View style={styles.quickSettingsGrid}>
            <TouchableOpacity 
              style={[styles.quickSettingButton, styles.beginnerButton]} 
              onPress={() => applyQuickPreset('beginner')}
            >
              <Text style={styles.quickSettingIcon}>🌱</Text>
              <Text style={styles.quickSettingTitle}>초급자</Text>
              <Text style={styles.quickSettingSubtitle}>200kcal/일</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickSettingButton, styles.intermediateButton]} 
              onPress={() => applyQuickPreset('intermediate')}
            >
              <Text style={styles.quickSettingIcon}>💪</Text>
              <Text style={styles.quickSettingTitle}>중급자</Text>
              <Text style={styles.quickSettingSubtitle}>350kcal/일</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickSettingButton, styles.advancedButton]} 
              onPress={() => applyQuickPreset('advanced')}
            >
              <Text style={styles.quickSettingIcon}>🔥</Text>
              <Text style={styles.quickSettingTitle}>고급자</Text>
              <Text style={styles.quickSettingSubtitle}>500kcal/일</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 주간 통계 */}
        <View style={styles.weeklyStatsSection}>
          <Text style={styles.sectionHeader}>📊 주간 통계</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => openEditModal('weeklySquats', goals.weeklySquats)}
            >
              <LinearGradient colors={['#00d4ff', '#0066cc']} style={styles.statGradient}>
                <Text style={styles.statIcon}>🏋️</Text>
                <Text style={styles.statValue}>{currentProgress.weeklySquats}</Text>
                <Text style={styles.statLabel}>스쿼트</Text>
                <Text style={styles.statGoal}>목표: {goals.weeklySquats}</Text>
                <Text style={styles.statEditHint}>터치하여 편집</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => openEditModal('weeklyBench', goals.weeklyBench)}
            >
              <LinearGradient colors={['#ff006e', '#cc0044']} style={styles.statGradient}>
                <Text style={styles.statIcon}>💪</Text>
                <Text style={styles.statValue}>{currentProgress.weeklyBench}</Text>
                <Text style={styles.statLabel}>벤치프레스</Text>
                <Text style={styles.statGoal}>목표: {goals.weeklyBench}</Text>
                <Text style={styles.statEditHint}>터치하여 편집</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => openEditModal('weeklyDeadlift', goals.weeklyDeadlift)}
            >
              <LinearGradient colors={['#06ffa5', '#00cc88']} style={styles.statGradient}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={styles.statValue}>{currentProgress.weeklyDeadlift}</Text>
                <Text style={styles.statLabel}>데드리프트</Text>
                <Text style={styles.statGoal}>목표: {goals.weeklyDeadlift}</Text>
                <Text style={styles.statEditHint}>터치하여 편집</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => openEditModal('weeklyTime', goals.weeklyTime)}
            >
              <LinearGradient colors={['#ffa500', '#ff8800']} style={styles.statGradient}>
                <Text style={styles.statIcon}>⏰</Text>
                <Text style={styles.statValue}>{currentProgress.weeklyTime}</Text>
                <Text style={styles.statLabel}>운동시간(분)</Text>
                <Text style={styles.statGoal}>목표: {goals.weeklyTime}</Text>
                <Text style={styles.statEditHint}>터치하여 편집</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => openEditModal('weeklyCalories', goals.weeklyCalories)}
            >
              <LinearGradient colors={['#ff3366', '#cc1144']} style={styles.statGradient}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={styles.statValue}>{currentProgress.weeklyCalories}</Text>
                <Text style={styles.statLabel}>칼로리</Text>
                <Text style={styles.statGoal}>목표: {goals.weeklyCalories}</Text>
                <Text style={styles.statEditHint}>터치하여 편집</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* 성취 배지 */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionHeader}>🏆 성취 배지</Text>
          <View style={styles.badgesGrid}>
            {[
              { icon: '🥇', title: '목표 달성', description: '주간 목표 100% 달성', achieved: overallProgress >= 100 },
              { icon: '🔥', title: '열정의 불꽃', description: '연속 3일 운동', achieved: overallProgress >= 70 },
              { icon: '💪', title: '근성왕', description: '주간 목표 80% 이상', achieved: overallProgress >= 80 },
              { icon: '⭐', title: '별점 5개', description: '완벽한 운동 루틴', achieved: overallProgress >= 90 }
            ].map((badge, index) => (
              <View key={index} style={[styles.badgeCard, badge.achieved && styles.badgeAchieved]}>
                <Text style={[styles.badgeIcon, !badge.achieved && styles.badgeGrayedOut]}>{badge.icon}</Text>
                <Text style={[styles.badgeTitle, !badge.achieved && styles.badgeGrayedOut]}>{badge.title}</Text>
                <Text style={[styles.badgeDescription, !badge.achieved && styles.badgeGrayedOut]}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  });

  const GoalCard = React.memo(({ title, current, goal, unit, onEdit }) => {
    const progress = calculateProgress(current, goal);
    const progressColor = getProgressColor(progress);
    
    return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalTitle}>{title}</Text>
        {isEditing && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="pencil" size={20} color={gymTheme.colors.accent} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressCircle}>
          <View style={[
            styles.progressCircleInner,
            { 
                backgroundColor: progressColor,
                transform: [{ scale: progress }]
            }
          ]} />
        </View>
        <View style={styles.progressText}>
          <Text style={styles.progressNumber}>{current}</Text>
          <Text style={styles.progressUnit}>/{goal} {unit}</Text>
        </View>
      </View>
      
      <View style={styles.goalStats}>
        <Text style={styles.remainingText}>
          남은 {unit}: {Math.max(0, goal - current)}
        </Text>
        <Text style={styles.percentageText}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
    </View>
  );
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      <CommonHeader 
        navigation={navigation}
        title="운동 목표"
        rightComponent={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'dashboard' ? 'detailed' : 'dashboard')}
              style={styles.headerButton}
            >
              <Ionicons 
                name={viewMode === 'dashboard' ? "list" : "grid"} 
                size={24} 
                color={gymTheme.colors.text} 
              />
            </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            style={styles.headerButton}
          >
            <Ionicons 
              name={isEditing ? "checkmark" : "pencil"} 
              size={24} 
              color={gymTheme.colors.text} 
            />
          </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {viewMode === 'dashboard' ? (
          <DashboardView />
        ) : (
          <>
        {/* 목표 설정 안내 */}
        <LinearGradient
          colors={gymTheme.gradients.card}
          style={styles.infoCard}
        >
          <Ionicons name="trophy" size={32} color={gymTheme.colors.accent} />
          <Text style={styles.infoTitle}>목표를 설정하고 달성해보세요!</Text>
          <Text style={styles.infoText}>
            매일, 매주, 매월 운동 목표를 설정하고 진행률을 확인하세요.
          </Text>
        </LinearGradient>

            {/* 빠른 설정 버튼들 */}
            <View style={styles.presetSection}>
              <Text style={styles.presetTitle}>🚀 빠른 목표 설정</Text>
              <View style={styles.presetButtons}>
                <TouchableOpacity 
                  style={[styles.presetButton, styles.beginnerButton]} 
                  onPress={() => applyQuickPreset('beginner')}
                >
                  <Text style={styles.presetButtonText}>초급자</Text>
                  <Text style={styles.presetSubtext}>200kcal/일</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.presetButton, styles.intermediateButton]} 
                  onPress={() => applyQuickPreset('intermediate')}
                >
                  <Text style={styles.presetButtonText}>중급자</Text>
                  <Text style={styles.presetSubtext}>350kcal/일</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.presetButton, styles.advancedButton]} 
                  onPress={() => applyQuickPreset('advanced')}
                >
                  <Text style={styles.presetButtonText}>고급자</Text>
                  <Text style={styles.presetSubtext}>500kcal/일</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {viewMode === 'detailed' && (
          <>
        {/* 스쿼트 목표 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏋️ 스쿼트 목표</Text>
          
          <GoalCard
            title="일일 스쿼트"
            current={currentProgress.dailySquats}
            goal={goals.dailySquats}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '일일 스쿼트 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, dailySquats: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.dailySquats.toString()
              );
            }}
          />
          
          <GoalCard
            title="주간 스쿼트"
            current={currentProgress.weeklySquats}
            goal={goals.weeklySquats}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '주간 스쿼트 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, weeklySquats: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.weeklySquats.toString()
              );
            }}
          />
          
          <GoalCard
            title="월간 스쿼트"
            current={currentProgress.monthlySquats}
            goal={goals.monthlySquats}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '월간 스쿼트 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, monthlySquats: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.monthlySquats.toString()
              );
            }}
          />
        </View>

        {/* 벤치프레스 목표 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 벤치프레스 목표</Text>
          
          <GoalCard
            title="일일 벤치프레스"
            current={currentProgress.dailyBench}
            goal={goals.dailyBench}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '일일 벤치프레스 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, dailyBench: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.dailyBench.toString()
              );
            }}
          />
          
          <GoalCard
            title="주간 벤치프레스"
            current={currentProgress.weeklyBench}
            goal={goals.weeklyBench}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '주간 벤치프레스 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, weeklyBench: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.weeklyBench.toString()
              );
            }}
          />
          
          <GoalCard
            title="월간 벤치프레스"
            current={currentProgress.monthlyBench}
            goal={goals.monthlyBench}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '월간 벤치프레스 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, monthlyBench: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.monthlyBench.toString()
              );
            }}
          />
        </View>

        {/* 데드리프트 목표 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 데드리프트 목표</Text>
          
          <GoalCard
            title="일일 데드리프트"
            current={currentProgress.dailyDeadlift}
            goal={goals.dailyDeadlift}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '일일 데드리프트 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, dailyDeadlift: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.dailyDeadlift.toString()
              );
            }}
          />
          
          <GoalCard
            title="주간 데드리프트"
            current={currentProgress.weeklyDeadlift}
            goal={goals.weeklyDeadlift}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '주간 데드리프트 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, weeklyDeadlift: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.weeklyDeadlift.toString()
              );
            }}
          />
          
          <GoalCard
            title="월간 데드리프트"
            current={currentProgress.monthlyDeadlift}
            goal={goals.monthlyDeadlift}
            unit="회"
            onEdit={() => {
              Alert.prompt(
                '월간 데드리프트 목표',
                '목표 횟수를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, monthlyDeadlift: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.monthlyDeadlift.toString()
              );
            }}
          />
        </View>

        {/* 운동 시간 목표 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ 운동 시간 목표</Text>
          
          <GoalCard
            title="일일 운동 시간"
            current={currentProgress.dailyTime}
            goal={goals.dailyTime}
            unit="분"
            onEdit={() => {
              Alert.prompt(
                '일일 운동 시간 목표',
                '목표 시간(분)을 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, dailyTime: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.dailyTime.toString()
              );
            }}
          />
          
          <GoalCard
            title="주간 운동 시간"
            current={currentProgress.weeklyTime}
            goal={goals.weeklyTime}
            unit="분"
            onEdit={() => {
              Alert.prompt(
                '주간 운동 시간 목표',
                '목표 시간(분)을 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, weeklyTime: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.weeklyTime.toString()
              );
            }}
          />
          
          <GoalCard
            title="월간 운동 시간"
            current={currentProgress.monthlyTime}
            goal={goals.monthlyTime}
            unit="분"
            onEdit={() => {
              Alert.prompt(
                '월간 운동 시간 목표',
                '목표 시간(분)을 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, monthlyTime: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.monthlyTime.toString()
              );
            }}
          />
        </View>

        {/* 칼로리 목표 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 칼로리 소모 목표</Text>
          
          <GoalCard
            title="일일 칼로리 소모"
            current={currentProgress.dailyCalories}
            goal={goals.dailyCalories}
            unit="kcal"
            onEdit={() => {
              Alert.prompt(
                '일일 칼로리 소모 목표',
                '목표 칼로리를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, dailyCalories: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.dailyCalories.toString()
              );
            }}
          />
          
          <GoalCard
            title="주간 칼로리 소모"
            current={currentProgress.weeklyCalories}
            goal={goals.weeklyCalories}
            unit="kcal"
            onEdit={() => {
              Alert.prompt(
                '주간 칼로리 소모 목표',
                '목표 칼로리를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, weeklyCalories: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.weeklyCalories.toString()
              );
            }}
          />
          
          <GoalCard
            title="월간 칼로리 소모"
            current={currentProgress.monthlyCalories}
            goal={goals.monthlyCalories}
            unit="kcal"
            onEdit={() => {
              Alert.prompt(
                '월간 칼로리 소모 목표',
                '목표 칼로리를 입력하세요:',
                (text) => {
                  if (text && !isNaN(text)) {
                    setGoals(prev => ({ ...prev, monthlyCalories: parseInt(text) }));
                  }
                },
                'plain-text',
                goals.monthlyCalories.toString()
              );
            }}
          />
        </View>

        {/* 저장 버튼 */}
        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={saveGoals}>
            <LinearGradient
              colors={gymTheme.gradients.accent}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>목표 저장</Text>
            </LinearGradient>
          </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
      
      {/* 편집 모달 */}
      <EditModalComponent
        visible={editModal.visible}
        type={editModal.type}
        currentValue={editModal.currentValue}
        onClose={closeEditModal}
        onSave={saveGoal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  scrollView: {
    flex: 1,
  },
  
  content: {
    padding: gymTheme.spacing.lg,
  },
  
  headerButton: {
    padding: gymTheme.spacing.sm,
  },
  
  infoCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.xl,
    alignItems: 'center',
    ...gymTheme.shadows.medium,
  },
  
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginTop: gymTheme.spacing.md,
    marginBottom: gymTheme.spacing.sm,
  },
  
  infoText: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  section: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.lg,
  },
  
  goalCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.md,
    ...gymTheme.shadows.medium,
  },
  
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  editButton: {
    padding: gymTheme.spacing.sm,
  },
  
  progressContainer: {
    alignItems: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: gymTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  
  progressCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  progressText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  progressNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  progressUnit: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
  },
  
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  remainingText: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
  },
  
  saveButton: {
    marginTop: gymTheme.spacing.xl,
    borderRadius: gymTheme.borderRadius.large,
    overflow: 'hidden',
    ...gymTheme.shadows.medium,
  },
  
  saveButtonGradient: {
    paddingVertical: gymTheme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  presetSection: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  presetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.md,
    textAlign: 'center',
  },
  
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.sm,
  },
  
  presetButton: {
    flex: 1,
    padding: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.medium,
    alignItems: 'center',
    ...gymTheme.shadows.small,
  },
  
  beginnerButton: {
    backgroundColor: gymTheme.colors.success,
  },
  
  intermediateButton: {
    backgroundColor: gymTheme.colors.warning,
  },
  
  advancedButton: {
    backgroundColor: gymTheme.colors.error,
  },
  
  presetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.xs,
  },
  
  presetSubtext: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  headerButtons: {
    flexDirection: 'row',
    gap: gymTheme.spacing.sm,
  },
  
  dashboardContainer: {
    padding: gymTheme.spacing.md,
  },
  
  todaySummary: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  weeklySummary: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  overallProgress: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.lg,
    textAlign: 'center',
  },
  
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.md,
  },
  
  summaryCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.medium,
    padding: gymTheme.spacing.md,
    width: '48%',
    alignItems: 'center',
    ...gymTheme.shadows.small,
  },
  
  summaryIcon: {
    fontSize: 24,
    marginBottom: gymTheme.spacing.xs,
  },
  
  summaryLabel: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
    marginBottom: gymTheme.spacing.xs,
  },
  
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.xs,
  },
  
  summaryProgress: {
    height: 4,
    backgroundColor: gymTheme.colors.accent,
    borderRadius: 2,
    width: '100%',
  },
  
  weeklyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.sm,
  },
  
  weeklyCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.medium,
    padding: gymTheme.spacing.sm,
    width: '18%',
    alignItems: 'center',
    ...gymTheme.shadows.small,
  },
  
  weeklyIcon: {
    fontSize: 20,
    marginBottom: gymTheme.spacing.xs,
  },
  
  weeklyLabel: {
    fontSize: 10,
    color: gymTheme.colors.textSecondary,
    marginBottom: gymTheme.spacing.xs,
  },
  
  weeklyValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
  },
  
  overallCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    alignItems: 'center',
    ...gymTheme.shadows.medium,
  },
  
  overallLabel: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
    marginBottom: gymTheme.spacing.md,
  },
  
  overallValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    marginBottom: gymTheme.spacing.lg,
  },
  
  overallProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: gymTheme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  overallProgressFill: {
    height: '100%',
    backgroundColor: gymTheme.colors.accent,
    borderRadius: 4,
  },
  
  // 고급 대시보드 스타일들
  dashboardHeader: {
    padding: gymTheme.spacing.xl,
    borderRadius: gymTheme.borderRadius.large,
    marginBottom: gymTheme.spacing.lg,
    alignItems: 'center',
  },
  
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.xs,
  },
  
  dashboardSubtitle: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
    marginBottom: gymTheme.spacing.md,
  },
  
  motivationalMessage: {
    fontSize: 14,
    color: gymTheme.colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  overallProgressCard: {
    marginBottom: gymTheme.spacing.xl,
    borderRadius: gymTheme.borderRadius.large,
    overflow: 'hidden',
    ...gymTheme.shadows.large,
  },
  
  overallGradient: {
    padding: gymTheme.spacing.xl,
  },
  
  overallContent: {
    alignItems: 'center',
  },
  
  overallSubtext: {
    fontSize: 14,
    color: gymTheme.colors.text,
    marginTop: gymTheme.spacing.sm,
    fontWeight: '500',
  },
  
  todaySection: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  weeklyStatsSection: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  achievementsSection: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.lg,
    textAlign: 'center',
  },
  
  advancedGrid: {
    gap: gymTheme.spacing.md,
  },
  
  advancedCard: {
    marginBottom: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.large,
    overflow: 'hidden',
    ...gymTheme.shadows.medium,
  },
  
  advancedCardGradient: {
    padding: gymTheme.spacing.lg,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
  },
  
  cardIcon: {
    fontSize: 32,
    marginRight: gymTheme.spacing.md,
  },
  
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  cardPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
  },
  
  cardContent: {
    alignItems: 'center',
  },
  
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.sm,
  },
  
  cardProgressContainer: {
    width: '100%',
    marginBottom: gymTheme.spacing.sm,
  },
  
  cardProgressBar: {
    height: 8,
    backgroundColor: gymTheme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  cardProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  cardRemaining: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.sm,
  },
  
  statCard: {
    width: '48%',
    borderRadius: gymTheme.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: gymTheme.spacing.sm,
    ...gymTheme.shadows.small,
  },
  
  statGradient: {
    padding: gymTheme.spacing.md,
    alignItems: 'center',
  },
  
  statIcon: {
    fontSize: 24,
    marginBottom: gymTheme.spacing.xs,
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.xs,
  },
  
  statLabel: {
    fontSize: 12,
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.xs,
    textAlign: 'center',
  },
  
  statGoal: {
    fontSize: 10,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.sm,
  },
  
  badgeCard: {
    width: '48%',
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.medium,
    padding: gymTheme.spacing.md,
    alignItems: 'center',
    marginBottom: gymTheme.spacing.sm,
    ...gymTheme.shadows.small,
  },
  
  badgeAchieved: {
    backgroundColor: gymTheme.colors.accent + '20',
    borderWidth: 2,
    borderColor: gymTheme.colors.accent,
  },
  
  badgeIcon: {
    fontSize: 32,
    marginBottom: gymTheme.spacing.xs,
  },
  
  badgeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.xs,
    textAlign: 'center',
  },
  
  badgeDescription: {
    fontSize: 10,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  badgeGrayedOut: {
    opacity: 0.3,
  },
  
  // 편집 기능 관련 스타일들
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  
  editHint: {
    fontSize: 10,
    color: gymTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
  
  statEditHint: {
    fontSize: 8,
    color: gymTheme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  quickSettingsSection: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  quickSettingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.sm,
  },
  
  quickSettingButton: {
    flex: 1,
    padding: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.medium,
    alignItems: 'center',
    ...gymTheme.shadows.small,
  },
  
  quickSettingIcon: {
    fontSize: 24,
    marginBottom: gymTheme.spacing.xs,
  },
  
  quickSettingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.xs,
  },
  
  quickSettingSubtitle: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  // 모달 스타일들
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContainer: {
    width: '80%',
    maxWidth: 300,
  },
  
  modalContent: {
    padding: gymTheme.spacing.xl,
    borderRadius: gymTheme.borderRadius.large,
    ...gymTheme.shadows.large,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.sm,
  },
  
  modalSubtitle: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  
  modalInput: {
    backgroundColor: gymTheme.colors.surface,
    borderRadius: gymTheme.borderRadius.medium,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.md,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    color: gymTheme.colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.md,
  },
  
  modalButton: {
    flex: 1,
    paddingVertical: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.medium,
    alignItems: 'center',
  },
  
  cancelButton: {
    backgroundColor: gymTheme.colors.border,
  },
  
  saveButton: {
    backgroundColor: gymTheme.colors.accent,
  },
  
  cancelButtonText: {
    color: gymTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  
  saveButtonText: {
    color: gymTheme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
