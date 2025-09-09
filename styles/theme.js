// 헬스장 테마 색상 및 스타일 정의
export const gymTheme = {
  colors: {
    // 메인 색상 - 어두운 헬스장 느낌
    primary: '#1a1a1a',        // 메인 배경 (어두운 회색)
    secondary: '#2d2d2d',       // 보조 배경
    accent: '#ff6b35',          // 강조색 (오렌지)
    accent2: '#ff8c42',         // 보조 강조색
    text: '#ffffff',            // 메인 텍스트 (흰색)
    textSecondary: '#cccccc',   // 보조 텍스트
    textMuted: '#999999',       // 흐린 텍스트
    success: '#4caf50',         // 성공 색상
    warning: '#ff9800',         // 경고 색상
    error: '#f44336',           // 에러 색상
    border: '#404040',          // 테두리 색상
    card: '#333333',            // 카드 배경
    input: '#404040',           // 입력 필드 배경
  },
  
  // 그라데이션
  gradients: {
    primary: ['#1a1a1a', '#2d2d2d'],
    accent: ['#ff6b35', '#ff8c42'],
    card: ['#333333', '#404040'],
  },
  
  // 그림자
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.44,
      shadowRadius: 10.32,
      elevation: 16,
    },
  },
  
  // 타이포그래피
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      color: '#ffffff',
    },
    body: {
      fontSize: 16,
      color: '#ffffff',
    },
    caption: {
      fontSize: 14,
      color: '#cccccc',
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
  },
  
  // 간격
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // 둥근 모서리
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    xl: 16,
  },
};

// 헬스장 스타일 컴포넌트들
export const gymStyles = {
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  card: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.medium,
    padding: gymTheme.spacing.md,
    ...gymTheme.shadows.medium,
  },
  
  button: {
    primary: {
      backgroundColor: gymTheme.colors.accent,
      borderRadius: gymTheme.borderRadius.medium,
      paddingVertical: gymTheme.spacing.md,
      paddingHorizontal: gymTheme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...gymTheme.shadows.small,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: gymTheme.colors.accent,
      borderRadius: gymTheme.borderRadius.medium,
      paddingVertical: gymTheme.spacing.md,
      paddingHorizontal: gymTheme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  
  input: {
    backgroundColor: gymTheme.colors.input,
    borderRadius: gymTheme.borderRadius.small,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.sm,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    color: gymTheme.colors.text,
    fontSize: 16,
  },
  
  // Picker 전용 스타일 - 텍스트 가시성 보장
  picker: {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    // Android에서 강제 적용
    textAlignVertical: 'center',
  },
  
  pickerItem: {
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}; 