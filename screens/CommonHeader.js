// CommonHeader.js
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { UserContext } from './UserContext';
import { gymTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CommonHeader = ({ navigation, title, showBackButton = false, onBackPress }) => {
  const { user, logoutUser } = useContext(UserContext);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [isWorkingOut, setIsWorkingOut] = useState(false);

  // 타이머 로직
  useEffect(() => {
    if (!user) return;

    const checkWorkoutStatus = async () => {
      try {
        const checkInTime = await AsyncStorage.getItem('checkInTime');
        if (checkInTime) {
          setIsWorkingOut(true);
          console.log('운동 중 - 타이머 시작');
        } else {
          setIsWorkingOut(false);
          setElapsed('00:00:00');
          console.log('운동 중 아님 - 타이머 정지');
        }
      } catch (error) {
        console.error('운동 상태 확인 실패:', error);
      }
    };

    checkWorkoutStatus();
  }, [user]);

  useEffect(() => {
    if (!isWorkingOut) {
      setElapsed('00:00:00');
      return;
    }

    const timer = setInterval(async () => {
      try {
        const checkInTimeStr = await AsyncStorage.getItem('checkInTime');
        if (checkInTimeStr) {
          const checkInTime = new Date(checkInTimeStr);
          const now = new Date();
          const diff = now - checkInTime;
          
          if (diff < 0) {
            setElapsed('00:00:00');
            return;
          }

          const hours = Math.floor(diff / 3600000);
          const minutes = Math.floor((diff % 3600000) / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          
          const h = String(hours).padStart(2, '0');
          const m = String(minutes).padStart(2, '0');
          const s = String(seconds).padStart(2, '0');
          
          setElapsed(`${h}:${m}:${s}`);
        } else {
          setIsWorkingOut(false);
          setElapsed('00:00:00');
        }
      } catch (error) {
        console.error('타이머 업데이트 실패:', error);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isWorkingOut]);

  const handleLogout = async () => {
    // 입실 상태 확인
    const checkInTime = await AsyncStorage.getItem('checkInTime');
    
    if (checkInTime) {
      // 입실 중이면 퇴실 처리 후 로그아웃
      Alert.alert(
        '로그아웃',
        '입실 중입니다. 퇴실 처리 후 로그아웃됩니다.',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '퇴실 후 로그아웃', 
            style: 'destructive',
            onPress: async () => {
              try {
                // 퇴실 API 호출
                const payload = {
                  user_id: user.id,
                  check_out: new Date().toISOString(),
                };
                
                const response = await fetch('http://13.209.67.129:8000/visits/checkout', {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                
                if (response.ok) {
                  // 퇴실 성공 시 checkInTime 제거
                  await AsyncStorage.removeItem('checkInTime');
                  console.log('퇴실 처리 완료 후 로그아웃');
                } else {
                  console.log('퇴실 API 호출 실패, 로그아웃만 진행');
                }
              } catch (error) {
                console.error('퇴실 처리 중 오류:', error);
                // 퇴실 실패해도 로그아웃은 진행
              }
              
              // 로그아웃 처리
              await logoutUser();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        ]
      );
    } else {
      // 입실하지 않은 상태면 바로 로그아웃
      Alert.alert(
        '로그아웃',
        '정말 로그아웃하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '로그아웃', 
            style: 'destructive',
            onPress: async () => {
              await logoutUser();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        ]
      );
    }
  };

  if (!user) return null;

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {showBackButton && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBackPress}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.userSection}>
          <Text style={styles.userName}>{user.name}님</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
                 {isWorkingOut && (
           <View style={styles.timerContainer}>
             <Text style={styles.timerLabel}>운동 시간:</Text>
             <Text style={styles.timerText}>{elapsed}</Text>
           </View>
         )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: gymTheme.colors.secondary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: gymTheme.spacing.lg,
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  backButton: {
    marginRight: gymTheme.spacing.sm,
    padding: 8,
  },
  
  backButtonText: {
    fontSize: 24,
    color: gymTheme.colors.text,
    fontWeight: 'bold',
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    flex: 1,
  },
  
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.xs,
  },
  
  timerContainer: {
    backgroundColor: gymTheme.colors.accent,
    paddingHorizontal: gymTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: gymTheme.borderRadius.small,
    marginTop: gymTheme.spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-start',
  },
  
  timerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: gymTheme.colors.text,
    marginRight: gymTheme.spacing.sm,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  
  userName: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginRight: gymTheme.spacing.sm,
  },
  
  logoutButton: {
    backgroundColor: gymTheme.colors.error,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.medium,
  },
  
  logoutButtonText: {
    color: gymTheme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CommonHeader;
