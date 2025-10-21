// CommonHeader.js
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { UserContext } from './UserContext';
import { gymTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CommonHeader = ({ navigation, title }) => {
  const { user, logoutUser, elapsed, isWorkingOut } = useContext(UserContext);

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
              
                             // 사용자 정보 먼저 정리 (운동 기록은 유지)
               try {
                 const keys = await AsyncStorage.getAllKeys();
                 const userDataKeys = keys.filter(key => 
                   key === 'checkInTime' ||
                   key === 'userData'
                 );
                 if (userDataKeys.length > 0) {
                   await AsyncStorage.multiRemove(userDataKeys);
                   console.log('사용자 정보 정리 완료:', userDataKeys);
                 }
               } catch (error) {
                 console.error('데이터 정리 중 오류:', error);
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
               // 사용자 정보 먼저 정리 (운동 기록은 유지)
               try {
                 const keys = await AsyncStorage.getAllKeys();
                 const userDataKeys = keys.filter(key => 
                   key === 'checkInTime' ||
                   key === 'userData'
                 );
                 if (userDataKeys.length > 0) {
                   await AsyncStorage.multiRemove(userDataKeys);
                   console.log('사용자 정보 정리 완료:', userDataKeys);
                 }
               } catch (error) {
                 console.error('데이터 정리 중 오류:', error);
               }
               
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
    paddingHorizontal: gymTheme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: gymTheme.colors.border,
    ...gymTheme.shadows.medium,
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  headerTitle: {
    ...gymTheme.typography.h3,
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
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.xs,
    borderRadius: gymTheme.borderRadius.full,
    marginTop: gymTheme.spacing.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    ...gymTheme.shadows.small,
  },
  
  timerLabel: {
    ...gymTheme.typography.caption,
    fontWeight: '700',
    marginRight: gymTheme.spacing.xs,
    fontFamily: 'monospace',
  },
  
  timerText: {
    ...gymTheme.typography.caption,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  
  userName: {
    ...gymTheme.typography.body2,
    marginRight: gymTheme.spacing.sm,
  },
  
  logoutButton: {
    backgroundColor: gymTheme.colors.error,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.md,
    ...gymTheme.shadows.small,
  },
  
  logoutButtonText: {
    ...gymTheme.typography.buttonSmall,
  },
});

export default CommonHeader;
