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
} from "react-native";
import { UserContext } from "./UserContext";
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import React from 'react';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';

const API_URL = "http://13.209.67.129:8000";

const CheckOutScreen = ({ navigation }) => {
  const { user, logoutUser } = useContext(UserContext);
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
    }
    
    (async () => {
      const checkInTime = await AsyncStorage.getItem('checkInTime');
      if (!checkInTime) {
        await AsyncStorage.removeItem('checkInTime');
        Alert.alert('알림', '입실 기록이 없습니다. 입실 화면으로 이동합니다.', [
          {
            text: '확인',
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'CheckIn' }] }),
          },
        ]);
      } else {
        setLoading(false);
      }
    })();
  }, [user]);

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
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={gymTheme.colors.accent} />
          <Text style={styles.loadingText}>퇴실 상태 확인 중...</Text>
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
        title="운동 완료하기"
        showBackButton={false}
      />

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        {/* 완료 메시지 */}
        <View style={styles.completionCard}>
          <Text style={styles.completionIcon}>🏋️</Text>
          <Text style={styles.completionTitle}>오늘의 운동 완료!</Text>
          <Text style={styles.completionText}>
            {user?.name}님, 수고하셨습니다! 💪
          </Text>
        </View>

        {/* 퇴실 버튼 */}
        <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
          <View style={styles.checkOutContent}>
            <Text style={styles.checkOutIcon}>🚪</Text>
            <Text style={styles.checkOutText}>퇴실하기</Text>
            <Text style={styles.checkOutSubtext}>운동을 마칩니다</Text>
          </View>
        </TouchableOpacity>

        {/* 오늘의 운동 버튼 */}
        <TouchableOpacity 
          style={styles.exerciseButton} 
          onPress={() => navigation.navigate("MyExercise")}
        >
          <View style={styles.exerciseContent}>
            <Text style={styles.exerciseIcon}>🏋️</Text>
            <Text style={styles.exerciseText}>오늘의 운동</Text>
          </View>
        </TouchableOpacity>

        {/* 프로필 버튼 */}
        <TouchableOpacity 
          style={styles.profileButton} 
          onPress={() => navigation.navigate("Profile")}
        >
          <View style={styles.profileContent}>
            <Text style={styles.profileIcon}>👤</Text>
            <Text style={styles.profileText}>내 정보 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 하단 정보 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>오늘도 수고하셨습니다!</Text>
          <Text style={styles.footerSubtext}>내일도 힘내세요 💪</Text>
        </View>
      </View>
    </View>
  );
};

CheckOutScreen.propTypes = {
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
  

  
  content: {
    flex: 1,
    padding: gymTheme.spacing.lg,
    justifyContent: 'center',
  },
  
  completionCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.xl,
    alignItems: 'center',
    marginBottom: gymTheme.spacing.xl,
    ...gymTheme.shadows.large,
  },
  
  completionIcon: {
    fontSize: 48,
    marginBottom: gymTheme.spacing.md,
  },
  
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.sm,
    textAlign: 'center',
  },
  
  completionText: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  checkOutButton: {
    backgroundColor: gymTheme.colors.error,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.xl,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  checkOutContent: {
    alignItems: 'center',
  },
  
  checkOutIcon: {
    fontSize: 32,
    marginBottom: gymTheme.spacing.sm,
  },
  
  checkOutText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 4,
  },
  
  checkOutSubtext: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  exerciseButton: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.md,
    ...gymTheme.shadows.medium,
  },
  
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  exerciseIcon: {
    fontSize: 24,
    marginRight: gymTheme.spacing.sm,
  },
  
  exerciseText: {
    fontSize: 18,
    fontWeight: '600',
    color: gymTheme.colors.text,
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

export default CheckOutScreen;
