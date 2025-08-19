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
} from "react-native";
import { UserContext } from "./UserContext";
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';

const API_URL = "http://13.209.67.129:8000";

const CheckInScreen = ({ navigation }) => {
  const { user } = useContext(UserContext);
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
        Alert.alert('알림', '이미 입실중입니다.', [
          { text: '확인', onPress: () => navigation.navigate('CheckOut') }
        ]);
        return;
      } else {
        await AsyncStorage.removeItem('checkInTime');
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
        throw new Error(text || '서버로 입실 정보 전송 실패');
      }
      
      await AsyncStorage.setItem('checkInTime', currentTime);
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
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={gymTheme.colors.accent} />
          <Text style={styles.loadingText}>입실 상태 확인 중...</Text>
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
        title="운동 시작하기"
        showBackButton={false}
      />

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        {/* 환영 메시지 */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeIcon}>🏋️</Text>
          <Text style={styles.welcomeTitle}>운동을 시작하세요!</Text>
          <Text style={styles.welcomeText}>
            {user?.name}님, 오늘도 힘내세요! 💪
          </Text>
        </View>

        {/* 입실 버튼 */}
        <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
          <View style={styles.checkInContent}>
            <Text style={styles.checkInIcon}>🚪</Text>
            <Text style={styles.checkInText}>입실하기</Text>
            <Text style={styles.checkInSubtext}>운동을 시작합니다</Text>
          </View>
        </TouchableOpacity>

        {/* 프로필 버튼 */}
        <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
          <View style={styles.profileContent}>
            <Text style={styles.profileIcon}>👤</Text>
            <Text style={styles.profileText}>내 정보 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 하단 정보 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AI 피드백으로 정확한 운동을</Text>
          <Text style={styles.footerSubtext}>카메라로 운동 자세를 분석해드립니다</Text>
        </View>
      </View>
    </View>
  );
};

CheckInScreen.propTypes = {
  navigation: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    marginTop: gymTheme.spacing.md,
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  header: {
    backgroundColor: gymTheme.colors.secondary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: gymTheme.spacing.lg,
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    letterSpacing: 2,
    marginBottom: 8,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  content: {
    flex: 1,
    padding: gymTheme.spacing.lg,
    justifyContent: 'center',
  },
  
  welcomeCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.xl,
    alignItems: 'center',
    marginBottom: gymTheme.spacing.xl,
    ...gymTheme.shadows.large,
  },
  
  welcomeIcon: {
    fontSize: 48,
    marginBottom: gymTheme.spacing.md,
  },
  
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.sm,
    textAlign: 'center',
  },
  
  welcomeText: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  checkInButton: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.xl,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  checkInContent: {
    alignItems: 'center',
  },
  
  checkInIcon: {
    fontSize: 32,
    marginBottom: gymTheme.spacing.sm,
  },
  
  checkInText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 4,
  },
  
  checkInSubtext: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  profileButton: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.xl,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    ...gymTheme.shadows.medium,
  },
  
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  profileIcon: {
    fontSize: 24,
    marginRight: gymTheme.spacing.sm,
  },
  
  profileText: {
    fontSize: 18,
    fontWeight: '600',
    color: gymTheme.colors.text,
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: gymTheme.spacing.lg,
  },
  
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: gymTheme.colors.text,
    marginBottom: 4,
  },
  
  footerSubtext: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
});

export default CheckInScreen;
