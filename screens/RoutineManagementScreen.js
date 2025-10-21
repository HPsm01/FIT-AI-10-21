import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import DatePicker from 'react-native-date-picker';
import RNPickerSelect from 'react-native-picker-select';
import { UserContext } from './UserContext';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';
import LinearGradient from 'react-native-linear-gradient';
import * as Animatable from 'react-native-animatable';

export default function RoutineManagementScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const [routines, setRoutines] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newRoutine, setNewRoutine] = useState({
    name: '',
    type: 'squat',
    targetCount: '',
    targetTime: '',
    notes: '',
    date: selectedDate,
  });

  const workoutTypes = [
    { label: '스쿼트', value: 'squat' },
    { label: '푸시업', value: 'pushup' },
    { label: '플랭크', value: 'plank' },
    { label: '버피', value: 'burpee' },
    { label: '점프잭', value: 'jumping_jack' },
    { label: '마운틴 클라이머', value: 'mountain_climber' },
  ];

  useEffect(() => {
    loadRoutines();
  }, [selectedDate]);

  const loadRoutines = async () => {
    try {
      const savedRoutines = await AsyncStorage.getItem(`routines_${user?.id}`);
      if (savedRoutines) {
        const allRoutines = JSON.parse(savedRoutines);
        const dayRoutines = allRoutines.filter(routine => routine.date === selectedDate);
        setRoutines(dayRoutines);
      }
    } catch (error) {
      console.error('루틴 불러오기 실패:', error);
    }
  };

  const saveRoutines = async (updatedRoutines) => {
    try {
      const allRoutines = await AsyncStorage.getItem(`routines_${user?.id}`);
      let routinesData = allRoutines ? JSON.parse(allRoutines) : [];
      
      // 해당 날짜의 루틴들 제거
      routinesData = routinesData.filter(routine => routine.date !== selectedDate);
      
      // 새로운 루틴들 추가
      routinesData = [...routinesData, ...updatedRoutines];
      
      await AsyncStorage.setItem(`routines_${user?.id}`, JSON.stringify(routinesData));
    } catch (error) {
      console.error('루틴 저장 실패:', error);
    }
  };

  const addRoutine = () => {
    if (!newRoutine.name.trim()) {
      Alert.alert('오류', '루틴 이름을 입력해주세요.');
      return;
    }
    
    if (!newRoutine.targetCount || isNaN(newRoutine.targetCount)) {
      Alert.alert('오류', '목표 횟수를 입력해주세요.');
      return;
    }

    const routine = {
      id: Date.now().toString(),
      ...newRoutine,
      targetCount: parseInt(newRoutine.targetCount),
      targetTime: newRoutine.targetTime ? parseInt(newRoutine.targetTime) : 0,
      completed: false,
    };

    const updatedRoutines = [...routines, routine];
    setRoutines(updatedRoutines);
    saveRoutines(updatedRoutines);
    
    setNewRoutine({
      name: '',
      type: 'squat',
      targetCount: '',
      targetTime: '',
      notes: '',
      date: selectedDate,
    });
    setShowAddModal(false);
  };

  const toggleRoutine = (id) => {
    const updatedRoutines = routines.map(routine =>
      routine.id === id ? { ...routine, completed: !routine.completed } : routine
    );
    setRoutines(updatedRoutines);
    saveRoutines(updatedRoutines);
  };

  const deleteRoutine = (id) => {
    Alert.alert(
      '루틴 삭제',
      '이 루틴을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const updatedRoutines = routines.filter(routine => routine.id !== id);
            setRoutines(updatedRoutines);
            saveRoutines(updatedRoutines);
          }
        }
      ]
    );
  };

  const getWorkoutIcon = (type) => {
    const icons = {
      squat: '🏋️',
      pushup: '💪',
      plank: '🤸',
      burpee: '🔥',
      jumping_jack: '🦘',
      mountain_climber: '🏃',
    };
    return icons[type] || '💪';
  };

  const getWorkoutTypeName = (type) => {
    const typeObj = workoutTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const RoutineCard = ({ routine }) => (
    <Animatable.View
      animation="fadeInUp"
      duration={300}
      style={[
        styles.routineCard,
        routine.completed && styles.completedCard
      ]}
    >
      <TouchableOpacity
        style={styles.routineContent}
        onPress={() => toggleRoutine(routine.id)}
      >
        <View style={styles.routineHeader}>
          <Text style={styles.routineIcon}>{getWorkoutIcon(routine.type)}</Text>
          <View style={styles.routineInfo}>
            <Text style={[
              styles.routineName,
              routine.completed && styles.completedText
            ]}>
              {routine.name}
            </Text>
            <Text style={styles.routineType}>
              {getWorkoutTypeName(routine.type)}
            </Text>
          </View>
          <View style={styles.routineActions}>
            <TouchableOpacity
              onPress={() => toggleRoutine(routine.id)}
              style={styles.checkButton}
            >
              <Ionicons
                name={routine.completed ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={routine.completed ? gymTheme.colors.success : gymTheme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteRoutine(routine.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color={gymTheme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.routineDetails}>
          <Text style={styles.routineTarget}>
            목표: {routine.targetCount}회
            {routine.targetTime > 0 && ` • ${routine.targetTime}분`}
          </Text>
          {routine.notes && (
            <Text style={styles.routineNotes}>{routine.notes}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      <CommonHeader 
        navigation={navigation}
        title="운동 루틴"
        rightComponent={
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.headerButton}
          >
            <Ionicons name="add" size={24} color={gymTheme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 달력 */}
        <View style={styles.calendarSection}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: gymTheme.colors.card,
              calendarBackground: gymTheme.colors.card,
              textSectionTitleColor: gymTheme.colors.text,
              selectedDayBackgroundColor: gymTheme.colors.accent,
              selectedDayTextColor: gymTheme.colors.text,
              todayTextColor: gymTheme.colors.accent,
              dayTextColor: gymTheme.colors.text,
              textDisabledColor: gymTheme.colors.textMuted,
              dotColor: gymTheme.colors.accent,
              selectedDotColor: gymTheme.colors.text,
              arrowColor: gymTheme.colors.accent,
              monthTextColor: gymTheme.colors.text,
              indicatorColor: gymTheme.colors.accent,
              textDayFontWeight: '600',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
            markingType={'custom'}
            markedDates={{
              [selectedDate]: {
                customStyles: {
                  container: {
                    backgroundColor: gymTheme.colors.accent,
                    borderRadius: 16,
                  },
                  text: {
                    color: gymTheme.colors.text,
                    fontWeight: 'bold',
                  },
                },
              },
            }}
          />
        </View>

        {/* 선택된 날짜 정보 */}
        <View style={styles.dateInfo}>
          <Text style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
          <Text style={styles.routineCount}>
            {routines.length}개의 루틴
          </Text>
        </View>

        {/* 루틴 목록 */}
        <View style={styles.routinesSection}>
          {routines.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color={gymTheme.colors.textMuted} />
              <Text style={styles.emptyText}>아직 루틴이 없습니다</Text>
              <Text style={styles.emptySubtext}>+ 버튼을 눌러 루틴을 추가해보세요</Text>
            </View>
          ) : (
            routines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} />
            ))
          )}
        </View>

        {/* 진행률 요약 */}
        {routines.length > 0 && (
          <View style={styles.progressSummary}>
            <Text style={styles.summaryTitle}>오늘의 진행률</Text>
            <View style={styles.summaryStats}>
              <Text style={styles.summaryText}>
                완료: {routines.filter(r => r.completed).length} / {routines.length}
              </Text>
              <Text style={styles.summaryPercentage}>
                {Math.round((routines.filter(r => r.completed).length / routines.length) * 100)}%
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 루틴 추가 모달 */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 루틴 추가</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={gymTheme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>루틴 이름</Text>
                <TextInput
                  style={styles.textInput}
                  value={newRoutine.name}
                  onChangeText={(text) => setNewRoutine(prev => ({ ...prev, name: text }))}
                  placeholder="예: 아침 스쿼트"
                  placeholderTextColor={gymTheme.colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>운동 타입</Text>
                <RNPickerSelect
                  onValueChange={(value) => setNewRoutine(prev => ({ ...prev, type: value }))}
                  items={workoutTypes}
                  style={pickerSelectStyles}
                  value={newRoutine.type}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>목표 횟수</Text>
                <TextInput
                  style={styles.textInput}
                  value={newRoutine.targetCount}
                  onChangeText={(text) => setNewRoutine(prev => ({ ...prev, targetCount: text }))}
                  placeholder="예: 100"
                  placeholderTextColor={gymTheme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>목표 시간 (분) - 선택사항</Text>
                <TextInput
                  style={styles.textInput}
                  value={newRoutine.targetTime}
                  onChangeText={(text) => setNewRoutine(prev => ({ ...prev, targetTime: text }))}
                  placeholder="예: 30"
                  placeholderTextColor={gymTheme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>메모 - 선택사항</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newRoutine.notes}
                  onChangeText={(text) => setNewRoutine(prev => ({ ...prev, notes: text }))}
                  placeholder="루틴에 대한 메모를 입력하세요"
                  placeholderTextColor={gymTheme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.addButton} onPress={addRoutine}>
                <LinearGradient
                  colors={gymTheme.gradients.accent}
                  style={styles.addButtonGradient}
                >
                  <Text style={styles.addButtonText}>추가</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    ...gymStyles.input,
    color: gymTheme.colors.text,
  },
  inputAndroid: {
    ...gymStyles.input,
    color: gymTheme.colors.text,
  },
});

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
  
  calendarSection: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.md,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  dateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  routineCount: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  routinesSection: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  routineCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.medium,
    marginBottom: gymTheme.spacing.md,
    ...gymTheme.shadows.small,
  },
  
  completedCard: {
    opacity: 0.7,
    backgroundColor: gymTheme.colors.secondary,
  },
  
  routineContent: {
    padding: gymTheme.spacing.lg,
  },
  
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.sm,
  },
  
  routineIcon: {
    fontSize: 24,
    marginRight: gymTheme.spacing.md,
  },
  
  routineInfo: {
    flex: 1,
  },
  
  routineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 2,
  },
  
  completedText: {
    textDecorationLine: 'line-through',
    color: gymTheme.colors.textMuted,
  },
  
  routineType: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  routineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  checkButton: {
    marginRight: gymTheme.spacing.md,
  },
  
  deleteButton: {
    padding: gymTheme.spacing.sm,
  },
  
  routineDetails: {
    marginTop: gymTheme.spacing.sm,
  },
  
  routineTarget: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginBottom: 4,
  },
  
  routineNotes: {
    fontSize: 12,
    color: gymTheme.colors.textMuted,
    fontStyle: 'italic',
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: gymTheme.spacing.xxl,
  },
  
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.textMuted,
    marginTop: gymTheme.spacing.md,
    marginBottom: gymTheme.spacing.sm,
  },
  
  emptySubtext: {
    fontSize: 14,
    color: gymTheme.colors.textMuted,
  },
  
  progressSummary: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.medium,
    padding: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.md,
  },
  
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  summaryText: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  summaryPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
  },
  
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: gymTheme.colors.card,
    borderTopLeftRadius: gymTheme.borderRadius.xl,
    borderTopRightRadius: gymTheme.borderRadius.xl,
    maxHeight: '80%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: gymTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: gymTheme.colors.border,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  closeButton: {
    padding: gymTheme.spacing.sm,
  },
  
  modalBody: {
    padding: gymTheme.spacing.lg,
  },
  
  inputGroup: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.sm,
  },
  
  textInput: {
    ...gymStyles.input,
    fontSize: 16,
  },
  
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  modalFooter: {
    flexDirection: 'row',
    padding: gymTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: gymTheme.colors.border,
  },
  
  cancelButton: {
    flex: 1,
    paddingVertical: gymTheme.spacing.md,
    marginRight: gymTheme.spacing.md,
    borderRadius: gymTheme.borderRadius.medium,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    alignItems: 'center',
  },
  
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: gymTheme.colors.textSecondary,
  },
  
  addButton: {
    flex: 1,
    borderRadius: gymTheme.borderRadius.medium,
    overflow: 'hidden',
  },
  
  addButtonGradient: {
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
});
