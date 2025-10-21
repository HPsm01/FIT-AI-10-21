import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { UserContext } from './UserContext';
import { gymTheme } from '../styles/theme';
import CommonHeader from './CommonHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { 
  BenchPressIcon, 
  SquatIcon, 
  DeadliftIcon, 
  GoalIcon, 
  StatsIcon, 
  SettingsIcon,
  TheFitLogo 
} from '../components/ImageComponents';
// import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const API_URL = 'http://13.209.67.129:8000';

export default function WorkoutTypeScreen({ navigation }) {
  const { user, updateWorkoutStatus } = useContext(UserContext);
  const [selectedType, setSelectedType] = useState(null);
  const [nearbyGyms, setNearbyGyms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // WorkoutTypeScreen 로드 시 운동 상태 확인
  useEffect(() => {
    const checkWorkoutStatus = async () => {
      console.log('🔍 WorkoutTypeScreen: 화면 로드 - 운동 상태 확인');
      await updateWorkoutStatus();
    };
    
    checkWorkoutStatus();
  }, []);

  // 위치 권한 요청 및 현재 위치 가져오기
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // TODO: expo-location 모듈 설치 후 주석 해제
      /*
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '근처 헬스장을 찾기 위해 위치 권한이 필요합니다.');
        setLoading(false);
        return;
      }

      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 주소 정보 가져오기
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0] ? 
          `${address[0].city || ''} ${address[0].district || ''} ${address[0].street || ''}`.trim() || 
          `${address[0].region || ''} ${address[0].subregion || ''}`.trim() :
          '위치 정보 없음'
      };
      */

      // 임시 위치 데이터 (대전 유성구)
      const locationData = {
        latitude: 36.3504,
        longitude: 127.3845,
        address: '대전광역시 유성구'
      };

      setUserLocation(locationData);
      
      // 근처 헬스장 검색
      await searchNearbyGyms(locationData);
      
    } catch (error) {
      console.error('위치 정보 가져오기 실패:', error);
      Alert.alert('오류', '위치 정보를 가져올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 두 지점 간의 거리 계산 (하버사인 공식)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 근처 헬스장 검색
  const searchNearbyGyms = async (location) => {
    try {
      const response = await fetch(`${API_URL}/gyms/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 5000, // 5km 반경
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNearbyGyms(data.gyms || []);
      } else {
        // API가 없을 경우 현재 위치 기반으로 임시 데이터 생성
        const gyms = generateNearbyGyms(location);
        setNearbyGyms(gyms);
      }
    } catch (error) {
      console.error('근처 헬스장 검색 실패:', error);
      // 오류 시 현재 위치 기반으로 임시 데이터 생성
      const gyms = generateNearbyGyms(location);
      setNearbyGyms(gyms);
    }
  };

  // 현재 위치 기반으로 근처 헬스장 데이터 생성
  const generateNearbyGyms = (location) => {
    const baseLat = location.latitude;
    const baseLon = location.longitude;
    const city = location.address.split(' ')[0] || '현재 위치';
    
    // 현재 위치 주변에 랜덤하게 헬스장 생성
    const gyms = [
      {
        id: 1,
        name: `${city} 피트니스 센터`,
        address: `${location.address} 대학로 123`,
        distance: calculateDistance(baseLat, baseLon, baseLat + 0.001, baseLon + 0.001),
        rating: 4.8,
        isOpen: true,
      },
      {
        id: 2,
        name: `스포츠몬스터 ${city}점`,
        address: `${location.address} 온천동 456`,
        distance: calculateDistance(baseLat, baseLon, baseLat + 0.002, baseLon - 0.001),
        rating: 4.6,
        isOpen: true,
      },
      {
        id: 3,
        name: `헬스장 24 ${city}`,
        address: `${location.address} 봉명동 789`,
        distance: calculateDistance(baseLat, baseLon, baseLat - 0.001, baseLon + 0.002),
        rating: 4.4,
        isOpen: Math.random() > 0.7, // 30% 확률로 휴무
      },
      {
        id: 4,
        name: `${city} 스포츠 클럽`,
        address: `${location.address} 지족동 321`,
        distance: calculateDistance(baseLat, baseLon, baseLat + 0.003, baseLon + 0.001),
        rating: 4.7,
        isOpen: true,
      },
    ];

    // 거리순으로 정렬
    return gyms.sort((a, b) => a.distance - b.distance);
  };

  // 운동 타입 선택
  const handleTypeSelection = async (type) => {
    setSelectedType(type);
    
    if (type === 'home') {
      // 홈트레이닝 선택 시 바로 입실 화면으로
      await AsyncStorage.setItem('workoutType', 'home');
      console.log('🏠 WorkoutTypeScreen: 홈트레이닝 선택 - CheckIn으로 이동');
      
      // UserContext 운동 상태 확인
      await updateWorkoutStatus();
      
      navigation.navigate('CheckIn');
    } else if (type === 'gym') {
      // GYM 선택 시 위치 기반 헬스장 검색
      await getCurrentLocation();
    }
  };

  // 헬스장 선택
  const handleGymSelection = async (gym) => {
    try {
      await AsyncStorage.setItem('workoutType', 'gym');
      await AsyncStorage.setItem('selectedGym', JSON.stringify(gym));
      console.log('🏢 WorkoutTypeScreen: 헬스장 선택 - CheckIn으로 이동');
      
      // UserContext 운동 상태 확인
      await updateWorkoutStatus();
      
      navigation.navigate('CheckIn');
    } catch (error) {
      console.error('헬스장 정보 저장 실패:', error);
      Alert.alert('오류', '헬스장 정보를 저장할 수 없습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.background} />
      
      <CommonHeader 
        navigation={navigation}
        title="운동 시작하기"
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 환영 메시지 */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeIcon}>🏋️</Text>
          <Text style={styles.welcomeTitle}>어디서 운동하시나요?</Text>
          <Text style={styles.welcomeText}>
            {user?.name}님, 오늘도 힘내세요! 💪
          </Text>
        </View>

        {/* 운동 타입 선택 */}
        <View style={styles.typeSelectionCard}>
          <Text style={styles.sectionTitle}>운동 장소를 선택해주세요</Text>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'home' && styles.typeButtonSelected
            ]}
            onPress={() => handleTypeSelection('home')}
          >
            <View style={styles.typeButtonContent}>
              <Text style={styles.typeIcon}>🏠</Text>
              <View style={styles.typeTextContainer}>
                <Text style={styles.typeTitle}>홈트레이닝</Text>
                <Text style={styles.typeSubtitle}>집에서 운동하기</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'gym' && styles.typeButtonSelected
            ]}
            onPress={() => handleTypeSelection('gym')}
          >
            <View style={styles.typeButtonContent}>
              <Text style={styles.typeIcon}>🏢</Text>
              <View style={styles.typeTextContainer}>
                <Text style={styles.typeTitle}>헬스장</Text>
                <Text style={styles.typeSubtitle}>헬스장에서 운동하기</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 근처 헬스장 목록 */}
        {selectedType === 'gym' && (
          <View style={styles.gymListCard}>
            <View style={styles.gymListHeader}>
              <Text style={styles.sectionTitle}>근처 헬스장</Text>
              {userLocation && (
                <Text style={styles.locationText}>
                  📍 {userLocation.address}
                </Text>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={gymTheme.colors.accent} />
                <Text style={styles.loadingText}>근처 헬스장을 찾는 중...</Text>
              </View>
            ) : (
              <View style={styles.gymList}>
                {nearbyGyms.map((gym) => (
                  <TouchableOpacity
                    key={gym.id}
                    style={[
                      styles.gymItem,
                      !gym.isOpen && styles.gymItemClosed
                    ]}
                    onPress={() => gym.isOpen && handleGymSelection(gym)}
                    disabled={!gym.isOpen}
                  >
                    <View style={styles.gymItemContent}>
                      <View style={styles.gymInfo}>
                        <Text style={styles.gymName}>{gym.name}</Text>
                        <Text style={styles.gymAddress}>{gym.address}</Text>
                        <View style={styles.gymDetails}>
                          <Text style={styles.gymDistance}>
                            📍 {gym.distance}km
                          </Text>
                          <Text style={styles.gymRating}>
                            ⭐ {gym.rating}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.gymStatus}>
                        {gym.isOpen ? (
                          <Text style={styles.gymStatusOpen}>운영중</Text>
                        ) : (
                          <Text style={styles.gymStatusClosed}>휴무</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 하단 정보 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AI 피드백으로 정확한 운동을</Text>
          <Text style={styles.footerSubtext}>카메라로 운동 자세를 분석해드립니다</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.background,
  },
  
  scrollView: {
    flex: 1,
  },
  
  content: {
    padding: gymTheme.spacing.base,
    paddingBottom: gymTheme.spacing.base,
  },
  
  welcomeCard: {
    backgroundColor: gymTheme.colors.cardElevated,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.base,
    alignItems: 'center',
    marginBottom: gymTheme.spacing.base,
    borderWidth: 1,
    borderColor: gymTheme.colors.borderLight,
    ...gymTheme.shadows.medium,
  },
  
  welcomeIcon: {
    fontSize: 48,
    marginBottom: gymTheme.spacing.sm,
  },
  
  welcomeTitle: {
    ...gymTheme.typography.h2,
    marginBottom: gymTheme.spacing.md,
    textAlign: 'center',
  },
  
  welcomeText: {
    ...gymTheme.typography.body1,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  typeSelectionCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.base,
    marginBottom: gymTheme.spacing.base,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    ...gymTheme.shadows.medium,
  },
  
  sectionTitle: {
    ...gymTheme.typography.h5,
    marginBottom: gymTheme.spacing.md,
  },
  
  typeButton: {
    backgroundColor: gymTheme.colors.surface,
    borderRadius: gymTheme.borderRadius.md,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...gymTheme.shadows.small,
  },
  
  typeButtonSelected: {
    borderColor: gymTheme.colors.accent,
    backgroundColor: gymTheme.colors.accent + '20',
    ...gymTheme.shadows.medium,
  },
  
  typeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  typeIcon: {
    fontSize: 40,
    marginRight: gymTheme.spacing.md,
  },
  
  typeTextContainer: {
    flex: 1,
  },
  
  typeTitle: {
    ...gymTheme.typography.h4,
    marginBottom: gymTheme.spacing.xs,
  },
  
  typeSubtitle: {
    ...gymTheme.typography.body2,
  },
  
  gymListCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  gymListHeader: {
    marginBottom: gymTheme.spacing.md,
  },
  
  locationText: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginTop: 4,
  },
  
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: gymTheme.spacing.xl,
  },
  
  loadingText: {
    marginTop: gymTheme.spacing.md,
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  gymList: {
    gap: gymTheme.spacing.md,
  },
  
  gymItem: {
    backgroundColor: gymTheme.colors.surface,
    borderRadius: gymTheme.borderRadius.medium,
    padding: gymTheme.spacing.md,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
  },
  
  gymItemClosed: {
    opacity: 0.6,
  },
  
  gymItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  gymInfo: {
    flex: 1,
  },
  
  gymName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 4,
  },
  
  gymAddress: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginBottom: 8,
  },
  
  gymDetails: {
    flexDirection: 'row',
    gap: gymTheme.spacing.md,
  },
  
  gymDistance: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
  },
  
  gymRating: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
  },
  
  gymStatus: {
    alignItems: 'center',
  },
  
  gymStatusOpen: {
    fontSize: 12,
    color: gymTheme.colors.success,
    fontWeight: 'bold',
    backgroundColor: gymTheme.colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  gymStatusClosed: {
    fontSize: 12,
    color: gymTheme.colors.error,
    fontWeight: 'bold',
    backgroundColor: gymTheme.colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: gymTheme.spacing.xl,
    marginTop: gymTheme.spacing.base,
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
