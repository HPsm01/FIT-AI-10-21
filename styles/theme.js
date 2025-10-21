// 프로페셔널 헬스장 테마 - 현대적이고 세련된 디자인
export const gymTheme = {
  colors: {
    // 메인 색상 - 프리미엄 다크 테마
    primary: '#0a0e27',        // 깊은 네이비 블랙 (더 전문적)
    secondary: '#1a1f3a',       // 진한 네이비
    tertiary: '#252b48',        // 중간 네이비
    
    // 강조색 - 에너지 넘치는 그라데이션
    accent: '#00d4ff',          // 시안 블루 (현대적)
    accent2: '#0096ff',         // 딥 블루
    accentGlow: '#00ffff',      // 네온 시안 (발광 효과용)
    
    // 보조 강조색
    highlight: '#ff006e',       // 비비드 핑크
    highlight2: '#8338ec',      // 바이올렛
    
    // 텍스트 계층
    text: '#ffffff',            // 최고 강조 텍스트
    textPrimary: '#e8ecf4',     // 주요 텍스트
    textSecondary: '#a8b2d1',   // 보조 텍스트
    textMuted: '#6b7794',       // 흐린 텍스트
    textDisabled: '#4a5568',    // 비활성 텍스트
    
    // 상태 색상 - 더 생생하게
    success: '#06ffa5',         // 네온 그린
    warning: '#ffb800',         // 골드 옐로우
    error: '#ff3366',           // 핫 핑크 레드
    info: '#00d4ff',            // 시안 블루
    
    // 배경 및 표면
    background: '#0a0e27',      // 메인 배경
    surface: '#151932',         // 표면 레이어
    card: '#1a1f3a',            // 카드 배경
    cardElevated: '#1f2542',    // 강조된 카드
    overlay: 'rgba(0, 0, 0, 0.7)', // 오버레이
    
    // 테두리 및 구분선
    border: '#2a3150',          // 기본 테두리
    borderLight: '#3a4165',     // 밝은 테두리
    divider: '#1f2542',         // 구분선
    
    // 입력 필드
    input: '#1f2542',           // 입력 배경
    inputFocused: '#252b48',    // 포커스된 입력
    inputBorder: '#3a4165',     // 입력 테두리
    
    // 글래스모피즘 효과
    glass: 'rgba(26, 31, 58, 0.7)',
    glassBorder: 'rgba(168, 178, 209, 0.1)',
  },
  
  // 그라데이션 - 더 다양하고 세련되게
  gradients: {
    primary: ['#0a0e27', '#1a1f3a', '#252b48'],
    accent: ['#00d4ff', '#0096ff'],
    accentReverse: ['#0096ff', '#00d4ff'],
    card: ['#1a1f3a', '#1f2542'],
    highlight: ['#ff006e', '#8338ec'],
    success: ['#06ffa5', '#00d4aa'],
    header: ['#1a1f3a', '#151932'],
    overlay: ['rgba(10, 14, 39, 0.95)', 'rgba(26, 31, 58, 0.85)'],
  },
  
  // 그림자 - 더 정교하고 깊이감 있게
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 20,
    },
    // 발광 효과 (네온 느낌)
    glow: {
      shadowColor: '#00d4ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 8,
    },
    glowAccent: {
      shadowColor: '#ff006e',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 10,
    },
  },
  
  // 타이포그래피 - 더 다양한 계층
  typography: {
    display: {
      fontSize: 40,
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: -0.5,
      lineHeight: 48,
    },
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: -0.4,
      lineHeight: 40,
    },
    h2: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#e8ecf4',
      letterSpacing: -0.3,
      lineHeight: 36,
    },
    h3: {
      fontSize: 24,
      fontWeight: '700',
      color: '#e8ecf4',
      letterSpacing: -0.2,
      lineHeight: 32,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      color: '#e8ecf4',
      lineHeight: 28,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      color: '#a8b2d1',
      lineHeight: 26,
    },
    body1: {
      fontSize: 16,
      fontWeight: '400',
      color: '#e8ecf4',
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400',
      color: '#a8b2d1',
      lineHeight: 20,
    },
    subtitle1: {
      fontSize: 16,
      fontWeight: '600',
      color: '#e8ecf4',
      lineHeight: 24,
    },
    subtitle2: {
      fontSize: 14,
      fontWeight: '600',
      color: '#a8b2d1',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      color: '#6b7794',
      lineHeight: 16,
    },
    overline: {
      fontSize: 10,
      fontWeight: '600',
      color: '#6b7794',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
      letterSpacing: 0.3,
    },
  },
  
  // 간격 - 더 정교한 간격 시스템
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    huge: 48,
    massive: 64,
  },
  
  // 둥근 모서리 - 더 다양한 옵션
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 6,
    md: 8,
    base: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
  
  // 애니메이션 타이밍
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
    verySlow: 500,
  },
  
  // 투명도 레벨
  opacity: {
    disabled: 0.4,
    medium: 0.6,
    light: 0.8,
    full: 1,
  },
  
  // 테두리 두께
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 3,
    heavy: 4,
  },
};

// 프로페셔널 스타일 컴포넌트들
export const gymStyles = {
  // 컨테이너
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.background,
  },
  
  containerPadded: {
    flex: 1,
    backgroundColor: gymTheme.colors.background,
    padding: gymTheme.spacing.base,
  },
  
  // 카드 스타일 - 여러 변형
  card: {
    basic: {
      backgroundColor: gymTheme.colors.card,
      borderRadius: gymTheme.borderRadius.lg,
      padding: gymTheme.spacing.base,
      ...gymTheme.shadows.medium,
    },
    elevated: {
      backgroundColor: gymTheme.colors.cardElevated,
      borderRadius: gymTheme.borderRadius.lg,
      padding: gymTheme.spacing.lg,
      borderWidth: 1,
      borderColor: gymTheme.colors.borderLight,
      ...gymTheme.shadows.large,
    },
    glass: {
      backgroundColor: gymTheme.colors.glass,
      borderRadius: gymTheme.borderRadius.lg,
      padding: gymTheme.spacing.base,
      borderWidth: 1,
      borderColor: gymTheme.colors.glassBorder,
      ...gymTheme.shadows.medium,
    },
    accent: {
      backgroundColor: gymTheme.colors.card,
      borderRadius: gymTheme.borderRadius.lg,
      padding: gymTheme.spacing.base,
      borderWidth: 2,
      borderColor: gymTheme.colors.accent,
      ...gymTheme.shadows.glow,
    },
  },
  
  // 버튼 스타일 - 더 다양하고 전문적으로
  button: {
    primary: {
      backgroundColor: gymTheme.colors.accent,
      borderRadius: gymTheme.borderRadius.base,
      paddingVertical: gymTheme.spacing.md,
      paddingHorizontal: gymTheme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      ...gymTheme.shadows.medium,
    },
    primaryLarge: {
      backgroundColor: gymTheme.colors.accent,
      borderRadius: gymTheme.borderRadius.lg,
      paddingVertical: gymTheme.spacing.base,
      paddingHorizontal: gymTheme.spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      ...gymTheme.shadows.glow,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: gymTheme.colors.accent,
      borderRadius: gymTheme.borderRadius.base,
      paddingVertical: gymTheme.spacing.md,
      paddingHorizontal: gymTheme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghost: {
      backgroundColor: 'rgba(0, 212, 255, 0.1)',
      borderRadius: gymTheme.borderRadius.base,
      paddingVertical: gymTheme.spacing.md,
      paddingHorizontal: gymTheme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    danger: {
      backgroundColor: gymTheme.colors.error,
      borderRadius: gymTheme.borderRadius.base,
      paddingVertical: gymTheme.spacing.md,
      paddingHorizontal: gymTheme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      ...gymTheme.shadows.glowAccent,
    },
    success: {
      backgroundColor: gymTheme.colors.success,
      borderRadius: gymTheme.borderRadius.base,
      paddingVertical: gymTheme.spacing.md,
      paddingHorizontal: gymTheme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    small: {
      backgroundColor: gymTheme.colors.accent,
      borderRadius: gymTheme.borderRadius.sm,
      paddingVertical: gymTheme.spacing.xs,
      paddingHorizontal: gymTheme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  
  // 입력 필드
  input: {
    basic: {
      backgroundColor: gymTheme.colors.input,
      borderRadius: gymTheme.borderRadius.md,
      paddingHorizontal: gymTheme.spacing.base,
      paddingVertical: gymTheme.spacing.md,
      borderWidth: 1,
      borderColor: gymTheme.colors.inputBorder,
      color: gymTheme.colors.textPrimary,
      fontSize: 16,
    },
    focused: {
      backgroundColor: gymTheme.colors.inputFocused,
      borderRadius: gymTheme.borderRadius.md,
      paddingHorizontal: gymTheme.spacing.base,
      paddingVertical: gymTheme.spacing.md,
      borderWidth: 2,
      borderColor: gymTheme.colors.accent,
      color: gymTheme.colors.text,
      fontSize: 16,
      ...gymTheme.shadows.glow,
    },
  },
  
  // 배지
  badge: {
    success: {
      backgroundColor: gymTheme.colors.success,
      paddingHorizontal: gymTheme.spacing.sm,
      paddingVertical: gymTheme.spacing.xxs,
      borderRadius: gymTheme.borderRadius.full,
    },
    warning: {
      backgroundColor: gymTheme.colors.warning,
      paddingHorizontal: gymTheme.spacing.sm,
      paddingVertical: gymTheme.spacing.xxs,
      borderRadius: gymTheme.borderRadius.full,
    },
    error: {
      backgroundColor: gymTheme.colors.error,
      paddingHorizontal: gymTheme.spacing.sm,
      paddingVertical: gymTheme.spacing.xxs,
      borderRadius: gymTheme.borderRadius.full,
    },
    info: {
      backgroundColor: gymTheme.colors.info,
      paddingHorizontal: gymTheme.spacing.sm,
      paddingVertical: gymTheme.spacing.xxs,
      borderRadius: gymTheme.borderRadius.full,
    },
  },
  
  // 구분선
  divider: {
    horizontal: {
      height: 1,
      backgroundColor: gymTheme.colors.divider,
      marginVertical: gymTheme.spacing.base,
    },
    vertical: {
      width: 1,
      backgroundColor: gymTheme.colors.divider,
      marginHorizontal: gymTheme.spacing.base,
    },
  },
  
  // Picker 전용 스타일 - 텍스트 가시성 보장
  picker: {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  
  pickerItem: {
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}; 