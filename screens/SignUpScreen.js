import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, SafeAreaView, Keyboard } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';
import { gymTheme, gymStyles } from '../styles/theme';

const SignUpScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("010");
  const [year, setYear] = useState("2000");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [gender, setGender] = useState("male");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // 키보드 이벤트 리스너
  useEffect(() => {
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

  const handleSignUpSubmit = async () => {
    if (!name.trim() || !phone.trim() || !weight.trim() || !height.trim()) {
      Alert.alert("입력 오류", "모든 필드를 입력해주세요.");
      return;
    }

    // 전화번호에서 하이픈 제거
    const phoneWithoutHyphens = phone.replace(/-/g, '');

    const userData = {
      username: name,
      phonenumber: phoneWithoutHyphens,
      birthday: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
      gender,
    };

    try {
      const response = await fetch("http://13.209.67.129:8000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      console.log("회원가입 응답:", data);

      if (response.ok && data.id) {
        const bodyData = {
          height_cm: parseFloat(height),
          weight_kg: parseFloat(weight),
        };

        const bodyResponse = await fetch(`http://13.209.67.129:8000/body/${data.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });

        if (!bodyResponse.ok) {
          const errText = await bodyResponse.text();
          console.warn("신체정보 저장 실패:", errText);
        }

        Alert.alert("회원가입 완료", "회원가입이 완료되었습니다. 로그인해주세요.", [
          { text: "확인", onPress: () => navigation.navigate("Login") }
        ]);
      } else {
        setErrorMessage(data.message || "회원가입 실패, 다시 시도해 주세요.");
      }
    } catch (error) {
      console.error("회원가입 오류:", error);
      setErrorMessage("서버 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.background} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💪 THE FIT</Text>
        <Text style={styles.headerSubtitle}>회원가입</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 회원가입 폼 */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>운동 파트너 등록</Text>
          
          {/* 기본 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>이름</Text>
              <TextInput
                style={styles.input}
                placeholder="이름을 입력하세요"
                placeholderTextColor={gymTheme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>전화번호</Text>
              <TextInput
                style={styles.input}
                placeholder="010-1234-5678"
                placeholderTextColor={gymTheme.colors.textMuted}
                value={phone}
                onChangeText={(text) => {
                  const formatted = formatPhoneNumber(text);
                  setPhone(formatted);
                }}
                keyboardType="phone-pad"
                maxLength={13}
                selectTextOnFocus={false}
                blurOnSubmit={false}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* 신체 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>신체 정보</Text>
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>키 (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="170"
                  placeholderTextColor={gymTheme.colors.textMuted}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.halfInput}>
                <Text style={styles.label}>몸무게 (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="70"
                  placeholderTextColor={gymTheme.colors.textMuted}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* 생년월일 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>생년월일</Text>
            <View style={styles.pickerRow}>
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>년도</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={year}
                    style={[styles.picker, { 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }]}
                    onValueChange={(value) => setYear(value)}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }}
                  >
                    {Array.from({ length: 2025 - 1960 + 1 }, (_, i) => {
                      const y = 1960 + i;
                      return <Picker.Item key={y} label={String(y)} value={String(y)} color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />;
                    })}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>월</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={month}
                    style={[styles.picker, { 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }]}
                    onValueChange={(value) => setMonth(value)}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1;
                      return <Picker.Item key={m} label={String(m)} value={String(m)} color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />;
                    })}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>일</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={day}
                    style={[styles.picker, { 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }]}
                    onValueChange={(value) => setDay(value)}
                    itemStyle={{ 
                      color: '#000000', 
                      backgroundColor: '#ffffff',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }}
                  >
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = i + 1;
                      return <Picker.Item key={d} label={String(d)} value={String(d)} color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />;
                    })}
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* 성별 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>성별</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={gender}
                style={[styles.picker, { 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }]}
                onValueChange={(value) => setGender(value)}
                itemStyle={{ 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                <Picker.Item label="남성" value="male" color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />
                <Picker.Item label="여성" value="female" color="#000000" style={{color: '#000000', fontSize: 16, fontWeight: 'bold'}} />
              </Picker>
            </View>
          </View>

          {/* 회원가입 버튼 */}
          <TouchableOpacity 
            style={[
              styles.signUpButton,
              (!name.trim() || !phone.trim() || !weight.trim() || !height.trim()) ? styles.signUpButtonDisabled : null
            ]} 
            onPress={handleSignUpSubmit}
            disabled={!name.trim() || !phone.trim() || !weight.trim() || !height.trim()}
          >
            <Text style={styles.signUpText}>회원가입 완료</Text>
          </TouchableOpacity>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      </ScrollView>

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

SignUpScreen.propTypes = {
  navigation: PropTypes.object,
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
  
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    letterSpacing: 2,
    marginBottom: gymTheme.spacing.xxs,
    textAlign: 'center',
  },
  
  headerSubtitle: {
    fontSize: 13,
    color: gymTheme.colors.textSecondary,
    textAlign: 'center',
  },
  
  scrollView: {
    flex: 1,
  },
  
  content: {
    padding: gymTheme.spacing.lg,
    paddingBottom: gymTheme.spacing.huge,
  },
  
  formCard: {
    backgroundColor: gymTheme.colors.cardElevated,
    borderRadius: gymTheme.borderRadius.lg,
    padding: gymTheme.spacing.xl,
    borderWidth: 1,
    borderColor: gymTheme.colors.borderLight,
    ...gymTheme.shadows.large,
  },
  
  formTitle: {
    ...gymTheme.typography.h3,
    textAlign: 'center',
    marginBottom: gymTheme.spacing.xl,
  },
  
  section: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  sectionTitle: {
    ...gymTheme.typography.h5,
    marginBottom: gymTheme.spacing.md,
  },
  
  inputContainer: {
    marginBottom: gymTheme.spacing.md,
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
  
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  halfInput: {
    width: '48%',
  },
  
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  pickerContainer: {
    width: '30%',
  },
  
  pickerWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: gymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    overflow: 'hidden',
  },
  
  picker: {
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    height: 50,
  },
  
  signUpButton: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.md,
    paddingVertical: gymTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  signUpButtonDisabled: {
    backgroundColor: '#555555',
    opacity: 0.5,
  },
  
  signUpText: {
    ...gymTheme.typography.button,
    fontSize: 16,
    textAlign: 'center',
  },
  
  errorText: {
    color: gymTheme.colors.error,
    marginTop: gymTheme.spacing.lg,
    textAlign: 'center',
    ...gymTheme.typography.body2,
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

export default SignUpScreen;
