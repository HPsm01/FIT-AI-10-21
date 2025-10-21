// CheckInScreen.js
import { useEffect, useState, useContext } from "react";
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

const CheckInScreen = ({ navigation }) => {
  const { user, updateWorkoutStatus } = useContext(UserContext);
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
    
    const checkAlreadyCheckedIn = async () => {
      try {
        // checkInTime 정리 로직 제거 - ProfileScreen에서 null이 되는 원인
        // const existingCheckInTime = await AsyncStorage.getItem('checkInTime');
        // if (existingCheckInTime) {
        //   console.log('이전 checkInTime 정리:', existingCheckInTime);
        //   await AsyncStorage.removeItem('checkInTime');
        // }
        console.log('CheckInScreen 로드됨 - checkInTime 정리하지 않음');
      } catch (error) {
        console.error('checkInTime 정리 중 오류:', error);
      }
      
      // 로그인 후에는 항상 입실 화면을 보여주기 위해 자동 이동 로직 제거
      setLoading(false);
    };
    checkAlreadyCheckedIn();
  }, [user, navigation]);

  const handleCheckIn = async () => {
    try {
      const res = await fetch(`${API_URL}/visits/last?user_id=${user.id}`);
      const lastVisit = await res.json();
      if (lastVisit && lastVisit.check_in && !lastVisit.check_out) {
        await AsyncStorage.setItem('checkInTime', lastVisit.check_in);
        
        // UserContext 운동 상태 즉시 업데이트
        await updateWorkoutStatus();
        
        Alert.alert('알림', '이미 입실중입니다.', [
          { text: '확인', onPress: () => navigation.navigate('CheckOut') }
        ]);
        return;
      } else {
        // 서버에 입실 기록이 없는 경우 - 기존 로컬 기록 정리하지 않음
        // await AsyncStorage.removeItem('checkInTime');
        console.log('서버에 입실 기록 없음 - 로컬 기록 유지');
      }
      
      const currentTime = new Date().toISOString();
      if (!user) throw new Error('사용자 정보가 없습니다.');
      
      const response = await fetch(`${API_URL}/visits/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          check_in: currentTime,
        }),
      });
      
      if (!response.ok) {
        const text = await response.text();
        
        // ✅ "이미 입실 상태" 오류 시 자동 퇴실 수행
        if (text.includes('이미 입실 상태입니다')) {
          console.log('자동 퇴실 수행 중...');
          
          try {
            // 자동 퇴실 API 호출
            const checkoutResponse = await fetch(`${API_URL}/visits/checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: user.id,
                check_out: new Date().toISOString(),
              }),
            });
            
            if (checkoutResponse.ok) {
              console.log('자동 퇴실 완료, 다시 입실 시도');
              
              // 퇴실 완료 후 다시 입실 시도
              const retryResponse = await fetch(`${API_URL}/visits/checkin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: user.id,
                  check_in: currentTime,
                }),
              });
              
              if (retryResponse.ok) {
                await AsyncStorage.setItem('checkInTime', currentTime);
                console.log('자동 퇴실 후 입실 완료 - checkInTime 저장:', currentTime);
                
                // UserContext 운동 상태 즉시 업데이트
                await updateWorkoutStatus();
                
                alert(`자동 퇴실 후 입실 완료\n입실 시간: ${new Date(currentTime).toLocaleString()}`);
                navigation.navigate('CheckOut');
                return;
              } else {
                throw new Error('재입실 시도 실패');
              }
            } else {
              throw new Error('자동 퇴실 실패');
            }
          } catch (autoCheckoutError) {
            console.error('자동 퇴실 중 오류:', autoCheckoutError);
            throw new Error('자동 퇴실 처리 중 오류가 발생했습니다.');
          }
        }
        
        throw new Error(text || '서버로 입실 정보 전송 실패');
      }
      
      await AsyncStorage.setItem('checkInTime', currentTime);
      console.log('입실 완료 - checkInTime 저장:', currentTime);
      
      // UserContext 운동 상태 즉시 업데이트
      await updateWorkoutStatus();
      
      alert(`입실 완료\n입실 시간: ${new Date(currentTime).toLocaleString()}`);
      navigation.navigate('CheckOut');
    } catch (error) {
      console.error('입실 처리 중 오류:', error);
      alert('입실 처리 중 오류가 발생했습니다.');
    }
  };

  const handleViewProfile = () => {
    navigation.navigate("Profile");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={gymTheme.colors.accent} />
          <Text style={styles.loadingText}>입실 상태 확인 중...</Text>
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
        title="운동 시작하기"
      />

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        {/* 사용자 정보 카드 */}
        <View style={styles.userInfoCard}>
          <View style={styles.userHeader}>
            <View style={styles.userIconContainer}>
              <TheFitLogo size={48} color={gymTheme.colors.accent} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userStatus}>준비 완료</Text>
            </View>
          </View>
        </View>

        {/* 입실 버튼 */}
        <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
          <View style={styles.checkInContent}>
            <View style={styles.checkInIconContainer}>
              <Text style={styles.checkInIcon}>▶</Text>
            </View>
            <View style={styles.checkInTextContainer}>
              <Text style={styles.checkInText}>운동 시작</Text>
              <Text style={styles.checkInSubtext}>START WORKOUT</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 빠른 액션 버튼들 */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("TotalExercise")}
          >
            <StatsIcon size={32} color={gymTheme.colors.accent} />
            <Text style={styles.actionText}>내 기록</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("GoalSetting")}
          >
            <GoalIcon size={32} color={gymTheme.colors.highlight} />
            <Text style={styles.actionText}>목표 설정</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("EditProfile")}
          >
            <SettingsIcon size={32} color={gymTheme.colors.warning} />
            <Text style={styles.actionText}>설정</Text>
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

CheckInScreen.propTypes = {
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
    backgroundColor: gymTheme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: gymTheme.spacing.base,
  },
  
  userIcon: {
    fontSize: 28,
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
  
  checkInButton: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.base,
    ...gymTheme.shadows.medium,
  },
  
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  checkInIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: gymTheme.spacing.base,
  },
  
  checkInIcon: {
    fontSize: 24,
    color: gymTheme.colors.text,
    fontWeight: 'bold',
  },
  
  checkInTextContainer: {
    alignItems: 'flex-start',
  },
  
  checkInText: {
    ...gymTheme.typography.h3,
    marginBottom: gymTheme.spacing.xxs,
  },
  
  checkInSubtext: {
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

export default CheckInScreen;
