import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar } from "react-native";
// LinearGradient 모듈 제거
import { UserContext } from "./UserContext";
import { gymTheme, gymStyles } from '../styles/theme';

const LoginScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const { loginUser } = useContext(UserContext);

  const handleLogin = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("입력 오류", "이름과 전화번호를 모두 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("http://13.209.67.129:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("로그인 성공:", result);
        console.log("로그인 성공:", result.userInfo);
        await loginUser(result.userInfo);

        // 로그인 성공 시 바로 CheckIn 화면으로 이동
        navigation.navigate("CheckIn");
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.logo}>GYM BUDDY</Text>
        <Text style={styles.subtitle}>운동 파트너와 함께</Text>
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
              onChangeText={setPhone}
              placeholder="010-1234-5678"
              placeholderTextColor={gymTheme.colors.textMuted}
              keyboardType="phone-pad"
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

      {/* 하단 정보 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>AI 피드백으로 정확한 운동을</Text>
        <Text style={styles.footerSubtext}>카메라로 운동 자세를 분석해드립니다</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: gymTheme.colors.secondary,
  },
  
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    letterSpacing: 2,
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  formContainer: {
    flex: 1,
    padding: gymTheme.spacing.lg,
    justifyContent: 'center',
  },
  
  formCard: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.xl,
    ...gymTheme.shadows.large,
  },
  
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.xl,
  },
  
  inputContainer: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.sm,
  },
  
  input: {
    backgroundColor: gymTheme.colors.input,
    borderRadius: gymTheme.borderRadius.medium,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.md,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    color: gymTheme.colors.text,
    fontSize: 16,
  },
  
  buttonContainer: {
    marginTop: gymTheme.spacing.xl,
  },
  
  loginButton: {
    borderRadius: gymTheme.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: gymTheme.spacing.md,
  },
  
  loginContainer: {
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
    borderRadius: gymTheme.borderRadius.medium,
  },
  
  loginActive: {
    backgroundColor: gymTheme.colors.accent,
  },
  
  loginInactive: {
    backgroundColor: '#555555',
  },
  
  loginText: {
    color: gymTheme.colors.text,
    fontWeight: 'bold',
    fontSize: 18,
  },
  
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    borderRadius: gymTheme.borderRadius.medium,
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
  },
  
  cancelText: {
    color: gymTheme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  
  signUpContainer: {
    alignItems: 'center',
    marginTop: gymTheme.spacing.xl,
  },
  
  signUpText: {
    fontSize: 16,
    color: gymTheme.colors.textSecondary,
  },
  
  signUpLink: {
    color: gymTheme.colors.accent,
    fontWeight: 'bold',
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: gymTheme.spacing.lg,
    paddingHorizontal: gymTheme.spacing.lg,
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

export default LoginScreen;
