// CheckOutScreen.js
import { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { UserContext } from "./UserContext";
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import React from 'react';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';
import { 
  BenchPressIcon, 
  SquatIcon, 
  DeadliftIcon, 
  GoalIcon, 
  StatsIcon, 
  SettingsIcon,
  TheFitLogo 
} from '../components/ImageComponents';

const API_URL = "http://13.209.67.129:8000";

const CheckOutScreen = ({ navigation }) => {
  const { user, logoutUser, updateWorkoutStatus } = useContext(UserContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      Alert.alert("알림", "사용자 정보가 없습니다. 다시 로그인해주세요.", [
        {
          text: "확인",
          onPress: () =>
            navigation.reset({ index: 0, routes: [{ name: "Login" }] }),
        },
      ]);
      return;
    }
    
    checkCheckInStatus();
  }, [user]);

  const checkCheckInStatus = async () => {
    try {
      // 로컬 AsyncStorage에서 checkInTime 확인
      const localCheckInTime = await AsyncStorage.getItem('checkInTime');
      
      if (localCheckInTime) {
        // 로컬에 입실 기록이 있는 경우 - 정상적으로 퇴실 화면 표시
        setLoading(false);
      } else {
        // 로컬에 입실 기록이 없는 경우 - 서버에서 확인
        try {
          const serverResponse = await fetch(`${API_URL}/visits/last?user_id=${user.id}`);
          const lastVisit = await serverResponse.json();
          
          // 서버에서 입실 상태 확인 (check_in이 있고 check_out이 없는 경우)
          const isCheckedInOnServer = lastVisit && lastVisit.check_in && !lastVisit.check_out;
          
          if (isCheckedInOnServer) {
            // 서버에는 입실 기록이 있지만 로컬에는 없는 경우 - 로컬 상태 복구
            await AsyncStorage.setItem('checkInTime', lastVisit.check_in);
            console.log('서버 상태로 로컬 상태 복구 완료');
            setLoading(false);
          } else {
            // 서버에도 입실 기록이 없는 경우 - 조용히 입실 화면으로 이동
            navigation.reset({ index: 0, routes: [{ name: 'CheckIn' }] });
          }
        } catch (serverError) {
          console.error('서버 확인 중 오류:', serverError);
          // 서버 확인 실패 시 조용히 입실 화면으로 이동
          navigation.reset({ index: 0, routes: [{ name: 'CheckIn' }] });
        }
      }
    } catch (error) {
      console.error('입실 상태 확인 중 오류:', error);
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      check_out: new Date().toISOString(),
    };
    console.log("▶️ CheckOut payload:", payload);

    try {
      const res = await fetch(`${API_URL}/visits/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("◀️ CheckOut raw response:", text);

      if (!res.ok) {
        let msg = text;
        try {
          const json = JSON.parse(text);
          msg = json.detail || json.message || text;
        } catch {}
        throw new Error(`${res.status}: ${msg}`);
      }

      const data = JSON.parse(text);
      console.log("✅ CheckOut data:", data);

      await AsyncStorage.removeItem('checkInTime');

      // UserContext 운동 상태 즉시 업데이트
      await updateWorkoutStatus();

      const inTime = new Date(data.check_in);
      const outTime = new Date(data.check_out);
      const diffMs = outTime - inTime;
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);

      Alert.alert(
        "퇴실 완료",
        `입실: ${inTime.toLocaleString()}\n퇴실: ${outTime.toLocaleString()}\n체류 시간: ${hours}시간 ${minutes}분\n\n운동을 완료했습니다. 입실 화면으로 돌아갑니다.`,
        [
          {
            text: "확인",
            onPress: () => {
              // 퇴실 완료 후 입실 화면으로 이동
              navigation.reset({
                index: 0,
                routes: [{ name: "CheckIn" }],
              });
            },
          },
        ]
      );
    } catch (e) {
      console.error("퇴실 실패:", e);
      Alert.alert("오류", e.message || "퇴실 처리 중 오류가 발생했습니다.");
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          '알림',
          '퇴실하기 기능을 수행할까요?',
          [
            { text: '취소', style: 'cancel' },
            { text: '확인', onPress: handleCheckOut },
          ]
        );
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity onPress={onBackPress} style={{ marginLeft: 16 }}>
            <Text style={{ fontSize: 18, color: gymTheme.colors.text }}>←</Text>
          </TouchableOpacity>
        ),
      });
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [handleCheckOut])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={gymTheme.colors.accent} />
          <Text style={styles.loadingText}>퇴실 상태 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.background} />
      
      {/* 공통 헤더 */}
      <CommonHeader 
        navigation={navigation}
        title="운동 완료하기"
      />

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        {/* 사용자 정보 카드 */}
        <View style={styles.userInfoCard}>
          <View style={styles.userHeader}>
            <View style={styles.userIconContainer}>
              <Text style={styles.userIcon}>✓</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userStatus}>운동 완료</Text>
            </View>
          </View>
        </View>

        {/* 퇴실 버튼 */}
        <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
          <View style={styles.checkOutContent}>
            <View style={styles.checkOutIconContainer}>
              <Text style={styles.checkOutIcon}>■</Text>
            </View>
            <View style={styles.checkOutTextContainer}>
              <Text style={styles.checkOutText}>운동 종료</Text>
              <Text style={styles.checkOutSubtext}>FINISH WORKOUT</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 빠른 액션 버튼들 */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("MyExercise")}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>운동 기록</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("TotalExercise")}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>통계</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("GoalSetting")}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionText}>목표 설정</Text>
          </TouchableOpacity>
        </View>

        {/* 하단 정보 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AI 기반 자세 분석</Text>
          <Text style={styles.footerSubtext}>실시간 피드백으로 완벽한 운동 자세를</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

CheckOutScreen.propTypes = {
  navigation: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    ...gymTheme.typography.body1,
    marginTop: gymTheme.spacing.base,
  },
  
  content: {
    flex: 1,
    padding: gymTheme.spacing.base,
    justifyContent: 'center',
  },
  
  userInfoCard: {
    backgroundColor: gymTheme.colors.cardElevated,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.xl,
    borderWidth: 1,
    borderColor: gymTheme.colors.borderLight,
    ...gymTheme.shadows.medium,
  },
  
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  userIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: gymTheme.colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: gymTheme.spacing.base,
  },
  
  userIcon: {
    fontSize: 32,
    color: gymTheme.colors.success,
    fontWeight: 'bold',
  },
  
  userDetails: {
    flex: 1,
  },
  
  userName: {
    ...gymTheme.typography.h3,
    marginBottom: gymTheme.spacing.xxs,
  },
  
  userStatus: {
    ...gymTheme.typography.body2,
    color: gymTheme.colors.success,
    fontWeight: '600',
  },
  
  checkOutButton: {
    backgroundColor: gymTheme.colors.error,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.base,
    ...gymTheme.shadows.medium,
  },
  
  checkOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  checkOutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: gymTheme.spacing.base,
  },
  
  checkOutIcon: {
    fontSize: 20,
    color: gymTheme.colors.text,
    fontWeight: 'bold',
  },
  
  checkOutTextContainer: {
    alignItems: 'flex-start',
  },
  
  checkOutText: {
    ...gymTheme.typography.h3,
    marginBottom: gymTheme.spacing.xxs,
  },
  
  checkOutSubtext: {
    ...gymTheme.typography.caption,
    color: gymTheme.colors.text,
    opacity: 0.8,
    letterSpacing: 1,
    fontWeight: '600',
  },
  
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: gymTheme.spacing.base,
    gap: gymTheme.spacing.sm,
  },
  
  actionButton: {
    flex: 1,
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.md,
    padding: gymTheme.spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    ...gymTheme.shadows.small,
  },
  
  actionIcon: {
    fontSize: 24,
    marginBottom: gymTheme.spacing.xs,
  },
  
  actionText: {
    ...gymTheme.typography.caption,
    fontWeight: '600',
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: gymTheme.spacing.xl,
  },
  
  footerText: {
    ...gymTheme.typography.subtitle1,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.xs,
  },
  
  footerSubtext: {
    ...gymTheme.typography.body2,
    textAlign: 'center',
  },
});

export default CheckOutScreen;
