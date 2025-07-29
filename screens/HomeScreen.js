//screens/HomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, StatusBar } from 'react-native';
// LinearGradient 모듈 제거
import { gymTheme, gymStyles } from '../styles/theme';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      {/* 헤더 섹션 */}
      <View style={styles.header}>
        <Text style={styles.logo}>GYM BUDDY</Text>
        <Text style={styles.subtitle}>당신의 운동 파트너</Text>
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        {/* 환영 메시지 */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>오늘도 힘내세요! 💪</Text>
          <Text style={styles.welcomeText}>운동 기록과 피드백을 통해 더 나은 모습을 만들어보세요.</Text>
        </View>

        {/* 메인 액션 버튼들 */}
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate("Login")}
          >
            <View style={styles.primaryCard}>
              <Text style={styles.actionIcon}>🏋️</Text>
              <Text style={styles.actionTitle}>운동 시작</Text>
              <Text style={styles.actionSubtitle}>로그인하고 운동을 기록하세요</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate("MyExercise")}
          >
            <View style={styles.secondaryCard}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionTitle}>운동 기록</Text>
              <Text style={styles.actionSubtitle}>나의 운동 히스토리 확인</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate("Profile")}
          >
            <View style={styles.secondaryCard}>
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionTitle}>프로필</Text>
              <Text style={styles.actionSubtitle}>내 정보와 통계 확인</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate("TotalExercise")}
          >
            <View style={styles.secondaryCard}>
              <Text style={styles.actionIcon}>📈</Text>
              <Text style={styles.actionTitle}>전체 기록</Text>
              <Text style={styles.actionSubtitle}>모든 운동 데이터 분석</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 하단 정보 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AI 피드백으로 더 정확한 운동을</Text>
          <Text style={styles.footerSubtext}>카메라로 운동 자세를 분석해드립니다</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    backgroundColor: gymTheme.colors.secondary,
  },
  
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    letterSpacing: 2,
  },
  
  subtitle: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
    marginTop: 8,
  },
  
  content: {
    flex: 1,
    padding: gymTheme.spacing.lg,
  },
  
  welcomeCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.xl,
    ...gymTheme.shadows.medium,
  },
  
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 8,
  },
  
  welcomeText: {
    fontSize: 14,
    color: gymTheme.colors.textSecondary,
    lineHeight: 20,
  },
  
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: gymTheme.spacing.xl,
  },
  
  actionCard: {
    width: '48%',
    marginBottom: gymTheme.spacing.md,
  },
  
  primaryCard: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...gymTheme.shadows.medium,
  },
  
  secondaryCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    ...gymTheme.shadows.medium,
  },
  
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  
  actionSubtitle: {
    fontSize: 12,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
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
