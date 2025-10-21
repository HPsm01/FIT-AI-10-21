import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, SafeAreaView, Keyboard } from "react-native";
// LinearGradient 모듈 제거
import { UserContext } from "./UserContext";
import { gymTheme, gymStyles } from '../styles/theme';

const LoginScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const { loginUser } = useContext(UserContext);

  const handleLogin = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("입력 오류", "이름과 전화번호를 모두 입력해주세요.");
      return;
    }

    // 전화번호에서 하이픈 제거
    const phoneWithoutHyphens = phone.replace(/-/g, '');

    try {
      const response = await fetch("http://13.209.67.129:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phoneWithoutHyphens }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("로그인 성공:", result);
        console.log("로그인 성공:", result.userInfo);
        await loginUser(result.userInfo);

        // 로그인 성공 시 운동 타입 선택 화면으로 이동
        navigation.navigate("WorkoutType");
      } else {
        console.log("로그인 실패:", result.message);
        Alert.alert("로그인 실패", result.message || "이름 또는 전화번호를 확인하세요.");
      }
    } catch (error) {
      console.error("로그인 오류:", error);
      Alert.alert("서버 오류", "서버와의 통신 중 문제가 발생했습니다.");
    }
  };

  const handleCancel = () => {
    setName("");
    setPhone("");
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp");
  };

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (text) => {
    // 숫자만 추출하고 빈 문자열이면 그대로 반환
    const numbers = text.replace(/[^0-9]/g, '');
    
    // 최대 11자리로 제한
    let formatted = numbers;
    if (formatted.length > 11) {
      formatted = formatted.substring(0, 11);
    }
    
    return formatPhoneWithHyphens(formatted);
  };

  // 하이픈 추가 함수 - 더 정교한 로직
  const formatPhoneWithHyphens = (numbers) => {
    if (numbers.length === 0) return '';
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return numbers.substring(0, 3) + '-' + numbers.substring(3);
    return numbers.substring(0, 3) + '-' + numbers.substring(3, 7) + '-' + numbers.substring(7);
  };

  // 키보드 이벤트 리스너
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.background} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.logo}>💪 THE FIT</Text>
        <Text style={styles.subtitle}>당신의 피트니스 파트너</Text>
      </View>

      {/* 로그인 폼 */}
      <View style={styles.formContainer}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>로그인</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력하세요"
              placeholderTextColor={gymTheme.colors.textMuted}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>전화번호</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(text) => {
                const formatted = formatPhoneNumber(text);
                setPhone(formatted);
              }}
              placeholder="010-1234-5678"
              placeholderTextColor={gymTheme.colors.textMuted}
              keyboardType="phone-pad"
              maxLength={13}
              selectTextOnFocus={false}
              blurOnSubmit={false}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={!name.trim() || !phone.trim()}
            >
              <View style={[
                styles.loginContainer,
                name.trim() && phone.trim() ? styles.loginActive : styles.loginInactive
              ]}>
                <Text style={styles.loginText}>로그인</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>초기화</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 회원가입 버튼 */}
        <TouchableOpacity style={styles.signUpContainer} onPress={handleSignUp}>
          <Text style={styles.signUpText}>
            계정이 없으신가요? <Text style={styles.signUpLink}>회원가입</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* 하단 정보 - 키보드가 올라올 때 숨김 */}
      {!isKeyboardVisible && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>AI 피드백으로 정확한 운동을</Text>
          <Text style={styles.footerSubtext}>카메라로 운동 자세를 분석해드립니다</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.background,
  },
  
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    backgroundColor: gymTheme.colors.secondary,
    borderBottomLeftRadius: gymTheme.borderRadius.xxl,
    borderBottomRightRadius: gymTheme.borderRadius.xxl,
    ...gymTheme.shadows.large,
  },
  
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    letterSpacing: 2,
    marginBottom: gymTheme.spacing.xxs,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 13,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  formContainer: {
    flex: 1,
    padding: gymTheme.spacing.lg,
    justifyContent: 'center',
  },
  
  formCard: {
    backgroundColor: gymTheme.colors.cardElevated,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.xl,
    borderWidth: 1,
    borderColor: gymTheme.colors.borderLight,
    ...gymTheme.shadows.large,
    marginHorizontal: gymTheme.spacing.sm,
  },
  
  formTitle: {
    ...gymTheme.typography.h3,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.xl,
  },
  
  inputContainer: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  label: {
    ...gymTheme.typography.subtitle2,
    marginBottom: gymTheme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  
  input: {
    backgroundColor: gymTheme.colors.surface,
    borderRadius: gymTheme.borderRadius.md,
    paddingHorizontal: gymTheme.spacing.base,
    paddingVertical: gymTheme.spacing.sm,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    color: gymTheme.colors.textPrimary,
    ...gymTheme.typography.body1,
    textAlign: 'left',
  },
  
  buttonContainer: {
    marginTop: gymTheme.spacing.lg,
  },
  
  loginButton: {
    borderRadius: gymTheme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: gymTheme.spacing.md,
  },
  
  loginContainer: {
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: gymTheme.borderRadius.md,
  },
  
  loginActive: {
    backgroundColor: gymTheme.colors.accent,
    ...gymTheme.shadows.medium,
  },
  
  loginInactive: {
    backgroundColor: gymTheme.colors.surface,
    opacity: gymTheme.opacity.disabled,
  },
  
  loginText: {
    ...gymTheme.typography.button,
    fontSize: 16,
    textAlign: 'center',
  },
  
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    borderRadius: gymTheme.borderRadius.md,
    paddingVertical: gymTheme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  cancelText: {
    ...gymTheme.typography.buttonSmall,
    fontSize: 14,
    textAlign: 'center',
  },
  
  signUpContainer: {
    alignItems: 'center',
    marginTop: gymTheme.spacing.lg,
    paddingVertical: gymTheme.spacing.sm,
  },
  
  signUpText: {
    ...gymTheme.typography.body1,
    textAlign: 'center',
  },
  
  signUpLink: {
    color: gymTheme.colors.accent,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: gymTheme.spacing.lg,
    paddingHorizontal: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.sm,
  },
  
  footerText: {
    ...gymTheme.typography.body1,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.xs,
  },
  
  footerSubtext: {
    ...gymTheme.typography.body2,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoginScreen;
