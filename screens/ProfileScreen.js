import { useContext, useEffect, useState, useLayoutEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UserContext } from "./UserContext";
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { gymTheme, gymStyles } from '../styles/theme';

export default function ProfileScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);

  const userInfo = user || {
    name: "이름 없음",
    phone: "정보 없음",
    height_cm: "-",
    weight_kg: "-",
    birth: "-",
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('CheckOut')}>
          <Ionicons name="arrow-back" size={28} color={gymTheme.colors.text} style={{ marginLeft: 16 }} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 프로필</Text>
        <Text style={styles.headerSubtitle}>운동 파트너 정보</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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

        {/* 액션 버튼들 */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TotalExercise')}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionTitle}>전체 운동 기록</Text>
              <Text style={styles.actionSubtitle}>모든 운동 데이터 확인</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionTitle}>내 정보 수정</Text>
              <Text style={styles.actionSubtitle}>프로필 정보 변경</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("MyExercise")}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionIcon}>🏋️</Text>
              <Text style={styles.actionTitle}>오늘의 운동</Text>
              <Text style={styles.actionSubtitle}>운동 기록 및 분석</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 퇴실 버튼 */}
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={async () => {
            if (!user) return;
            const payload = {
              user_id: user.id,
              check_out: new Date().toISOString(),
            };
            try {
              const res = await fetch('http://13.209.67.129:8000/visits/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const text = await res.text();
              if (!res.ok) {
                let msg = text;
                try {
                  const json = JSON.parse(text);
                  msg = json.detail || json.message || text;
                } catch {}
                throw new Error(`${res.status}: ${msg}`);
              }
              const data = JSON.parse(text);
              await AsyncStorage.removeItem('checkInTime');
              const inTime = new Date(data.check_in);
              const outTime = new Date(data.check_out);
              const diffMs = outTime - inTime;
              const hours = Math.floor(diffMs / 3600000);
              const minutes = Math.floor((diffMs % 3600000) / 60000);
              alert(`입실: ${inTime.toLocaleString()}\n퇴실: ${outTime.toLocaleString()}\n체류 시간: ${hours}시간 ${minutes}분`);
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            } catch (e) {
              alert(e.message || '퇴실 처리 중 오류가 발생했습니다.');
            }
          }}
        >
          <View style={styles.checkoutContent}>
            <Text style={styles.checkoutIcon}>🚪</Text>
            <Text style={styles.checkoutText}>퇴실하기</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

ProfileScreen.propTypes = {
  navigation: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  header: {
    backgroundColor: gymTheme.colors.secondary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: gymTheme.spacing.lg,
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 8,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  scrollView: {
    flex: 1,
  },
  
  content: {
    padding: gymTheme.spacing.lg,
  },
  
  profileCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.xl,
    ...gymTheme.shadows.medium,
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: gymTheme.spacing.lg,
  },
  
  profileIcon: {
    fontSize: 32,
    marginRight: gymTheme.spacing.md,
  },
  
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
  
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  infoItem: {
    width: '48%',
    marginBottom: gymTheme.spacing.md,
  },
  
  infoLabel: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    marginBottom: 4,
  },
  
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: gymTheme.colors.text,
  },
  
  actionSection: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  actionCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.md,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    ...gymTheme.shadows.medium,
  },
  
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  actionIcon: {
    fontSize: 24,
    marginRight: gymTheme.spacing.md,
  },
  
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 2,
  },
  
  actionSubtitle: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
  },
  
  checkoutButton: {
    backgroundColor: gymTheme.colors.error,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
  },
});
