// ImageComponents.js
import React from 'react';
import { Image, View, Text } from 'react-native';

// 운동 아이콘 컴포넌트들
export const BenchPressIcon = ({ size = 24, color = '#00d4ff' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size, color }}>🏋️</Text>
  </View>
);

export const SquatIcon = ({ size = 24, color = '#ff006e' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size, color }}>🦵</Text>
  </View>
);

export const DeadliftIcon = ({ size = 24, color = '#06ffa5' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size, color }}>🏋️‍♂️</Text>
  </View>
);

export const TimerIcon = ({ size = 24, color = '#00d4ff' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size, color }}>⏱️</Text>
  </View>
);

export const GoalIcon = ({ size = 24, color = '#ff006e' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size, color }}>🎯</Text>
  </View>
);

export const StatsIcon = ({ size = 24, color = '#06ffa5' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size, color }}>📊</Text>
  </View>
);

export const SettingsIcon = ({ size = 24, color = '#ffb800' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size, color }}>⚙️</Text>
  </View>
);

// 배경 이미지 컴포넌트
export const GradientBackground = ({ children, style }) => (
  <View style={[{ 
    backgroundColor: '#0a0e27',
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%)',
    ...style 
  }]}>
    {children}
  </View>
);

// 로고 컴포넌트 - 스쿼트 메인 버전
export const TheFitLogo = ({ size = 48, color = '#00d4ff' }) => (
  <View style={{ 
    width: size, 
    height: size, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    borderRadius: size / 4,
    borderWidth: 2,
    borderColor: color,
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  }}>
    <Text style={{ fontSize: size * 0.3, color: '#ff006e', fontWeight: 'bold' }}>🦵</Text>
    <Text style={{ 
      fontSize: size * 0.12, 
      color: '#ffffff', 
      fontWeight: '900',
      letterSpacing: 0.5,
      textShadowColor: color,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 2,
    }}>THE FIT</Text>
    <Text style={{ 
      fontSize: size * 0.08, 
      color, 
      fontWeight: 'bold',
      letterSpacing: 1,
    }}>GYM</Text>
  </View>
);

// 강화된 GYM 브랜딩 컴포넌트들
export const GymBrandHeader = ({ title = "THE FIT", subtitle = "GYM", size = 32 }) => (
  <View style={{
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  }}>
    <Text style={{
      fontSize: size,
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: 2,
      textShadowColor: '#00d4ff',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
    }}>
      {title}
    </Text>
    <Text style={{
      fontSize: size * 0.6,
      fontWeight: 'bold',
      color: '#00d4ff',
      letterSpacing: 3,
      marginTop: 4,
    }}>
      {subtitle}
    </Text>
  </View>
);

export const WorkoutBadge = ({ exercise, size = 24 }) => {
  const getExerciseIcon = (type) => {
    switch(type) {
      case 'bench': return '🏋️';
      case 'squat': return '🦵';
      case 'deadlift': return '🏋️‍♂️';
      default: return '💪';
    }
  };
  
  const getExerciseColor = (type) => {
    switch(type) {
      case 'bench': return '#00d4ff';
      case 'squat': return '#ff006e';
      case 'deadlift': return '#06ffa5';
      default: return '#ffb800';
    }
  };

  return (
    <View style={{
      width: size * 2,
      height: size * 2,
      borderRadius: size,
      backgroundColor: '#1a1f3a',
      borderWidth: 2,
      borderColor: getExerciseColor(exercise),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: getExerciseColor(exercise),
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    }}>
      <Text style={{ fontSize: size, color: getExerciseColor(exercise) }}>
        {getExerciseIcon(exercise)}
      </Text>
    </View>
  );
};
