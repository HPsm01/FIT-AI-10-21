import { useContext, useEffect, useState, useLayoutEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, BackHandler, Alert, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UserContext } from "./UserContext";
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';

export default function ProfileScreen({ navigation }) {
  const { user, setUser, elapsed, isWorkingOut } = useContext(UserContext);

  const userInfo = user || {
    name: "이름 없음",
    phone: "정보 없음",
    height_cm: "-",
    weight_kg: "-",
    birth: "-",
  };



  useFocusEffect(
    React.useCallback(() => {
      const fetchUser = async () => {
        if (!user?.id) return;
        try {
          const res = await fetch(`http://13.209.67.129:8000/users/${user.id}`);
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          }
        } catch (e) {
          // 무시 또는 필요시 에러 처리
        }
      };
      
      fetchUser();
    }, [user?.id])
  );


  // 하드웨어 백 버튼 핸들러
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = async () => {
        // 입실 상태 확인 후 적절한 화면으로 이동
        try {
          const localCheckInTime = await AsyncStorage.getItem('checkInTime');
          
          if (localCheckInTime) {
            // 입실 기록이 있으면 CheckOut 화면으로 이동
            navigation.navigate('CheckOut');
          } else {
            // 입실 기록이 없으면 CheckIn 화면으로 이동
            navigation.navigate('CheckIn');
          }
        } catch (error) {
          console.error('입실 상태 확인 중 오류:', error);
          navigation.navigate('CheckIn');
        }
        return true; // 기본 백 동작 방지
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [navigation])
  );


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.background} />
      
      {/* 공통 헤더 */}
      <CommonHeader 
        navigation={navigation}
        title="내 프로필"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 통계 개요 카드 */}
        <View style={styles.statsOverview}>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>이번 주</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxAccent]}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.statValue}>48</Text>
            <Text style={styles.statLabel}>총 운동일</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>87%</Text>
            <Text style={styles.statLabel}>목표 달성</Text>
          </View>
        </View>

        {/* 사용자 정보 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileIcon}>👤</Text>
            <Text style={styles.profileName}>{userInfo.name}</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>📱 연락처</Text>
              <Text style={styles.infoValue}>{userInfo.phone}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>📏 키</Text>
              <Text style={styles.infoValue}>{userInfo.height_cm || "-"} cm</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>⚖️ 몸무게</Text>
              <Text style={styles.infoValue}>{userInfo.weight_kg || "-"} kg</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>🎂 생년월일</Text>
              <Text style={styles.infoValue}>{userInfo.birth || "-"}</Text>
            </View>
          </View>
        </View>

        {/* 빠른 액션 그리드 */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('GoalSetting')}
          >
            <Text style={styles.quickActionIcon}>🎯</Text>
            <Text style={styles.quickActionTitle}>목표 설정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('RoutineManagement')}
          >
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionTitle}>루틴 관리</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Notification')}
          >
            <Text style={styles.quickActionIcon}>🔔</Text>
            <Text style={styles.quickActionTitle}>알림 설정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.quickActionIcon}>✏️</Text>
            <Text style={styles.quickActionTitle}>정보 수정</Text>
          </TouchableOpacity>
        </View>

        {/* 주요 기능 카드 */}
        <View style={styles.featureSection}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('TotalExercise')}
          >
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>📊</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>전체 운동 기록</Text>
              <Text style={styles.featureSubtitle}>모든 운동 데이터와 통계를 확인하세요</Text>
            </View>
            <Text style={styles.featureArrow}>›</Text>
          </TouchableOpacity>
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}

ProfileScreen.propTypes = {
  navigation: PropTypes.object,
};

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
  
  // 통계 개요
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: gymTheme.spacing.base,
    gap: gymTheme.spacing.sm,
  },
  
  statBox: {
    flex: 1,
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.md,
    padding: gymTheme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    ...gymTheme.shadows.small,
  },
  
  statBoxAccent: {
    backgroundColor: gymTheme.colors.cardElevated,
    borderColor: gymTheme.colors.accent,
    borderWidth: 2,
    ...gymTheme.shadows.medium,
  },
  
  statIcon: {
    fontSize: 24,
    marginBottom: gymTheme.spacing.xxs,
  },
  
  statValue: {
    ...gymTheme.typography.h4,
    marginBottom: gymTheme.spacing.xxs,
  },
  
  statLabel: {
    ...gymTheme.typography.caption,
    textAlign: 'center',
  },
  
  // 프로필 카드 - 더 전문적인 디자인
  profileCard: {
    backgroundColor: gymTheme.colors.cardElevated,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.base,
    marginBottom: gymTheme.spacing.base,
    borderWidth: 1,
    borderColor: gymTheme.colors.borderLight,
    ...gymTheme.shadows.medium,
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.md,
    paddingBottom: gymTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: gymTheme.colors.divider,
  },
  
  profileIcon: {
    fontSize: 36,
    marginRight: gymTheme.spacing.sm,
  },
  
  profileName: {
    ...gymTheme.typography.h2,
    flex: 1,
  },
  
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: gymTheme.spacing.md,
  },
  
  infoItem: {
    width: '48%',
    backgroundColor: gymTheme.colors.surface,
    padding: gymTheme.spacing.sm,
    borderRadius: gymTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    marginBottom: gymTheme.spacing.sm,
  },
  
  infoLabel: {
    ...gymTheme.typography.caption,
    marginBottom: gymTheme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  infoValue: {
    ...gymTheme.typography.subtitle1,
  },
  
  // 빠른 액션 그리드
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: gymTheme.spacing.base,
    gap: gymTheme.spacing.xs,
  },
  
  quickActionCard: {
    width: '48%',
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.md,
    padding: gymTheme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    ...gymTheme.shadows.small,
    marginBottom: gymTheme.spacing.sm,
  },
  
  quickActionIcon: {
    fontSize: 32,
    marginBottom: gymTheme.spacing.xs,
  },
  
  quickActionTitle: {
    ...gymTheme.typography.subtitle2,
    textAlign: 'center',
  },
  
  // 주요 기능 섹션
  featureSection: {
    marginBottom: gymTheme.spacing.base,
  },
  
  featureCard: {
    backgroundColor: gymTheme.colors.cardElevated,
    borderRadius: gymTheme.borderRadius.md,
    padding: gymTheme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: gymTheme.colors.borderLight,
    ...gymTheme.shadows.medium,
  },
  
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: gymTheme.borderRadius.sm,
    backgroundColor: gymTheme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: gymTheme.spacing.sm,
    ...gymTheme.shadows.small,
  },
  
  featureIcon: {
    fontSize: 24,
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    ...gymTheme.typography.h5,
    marginBottom: gymTheme.spacing.xxs,
  },
  
  featureSubtitle: {
    ...gymTheme.typography.caption,
  },
  
  featureArrow: {
    ...gymTheme.typography.display,
    color: gymTheme.colors.textMuted,
    marginLeft: gymTheme.spacing.sm,
  },
  
  checkoutButton: {
    backgroundColor: gymTheme.colors.error,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.base,
    ...gymTheme.shadows.glowAccent,
  },
  
  checkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  checkoutIcon: {
    fontSize: 24,
    marginRight: gymTheme.spacing.sm,
  },
  
  checkoutText: {
    ...gymTheme.typography.button,
  },

});
