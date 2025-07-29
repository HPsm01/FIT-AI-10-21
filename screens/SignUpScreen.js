import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';
import { gymTheme, gymStyles } from '../styles/theme';

const SighUpScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("010");
  const [year, setYear] = useState("2000");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [gender, setGender] = useState("male");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSighUpSubmit = async () => {
    if (!name.trim() || !phone.trim() || !weight.trim() || !height.trim()) {
      Alert.alert("입력 오류", "모든 필드를 입력해주세요.");
      return;
    }

    const userData = {
      username: name,
      phonenumber: phone,
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GYM BUDDY</Text>
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
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
                    style={styles.picker}
                    onValueChange={(value) => setYear(value)}
                    itemStyle={{ color: gymTheme.colors.text }}
                  >
                    {Array.from({ length: 2025 - 1960 + 1 }, (_, i) => {
                      const y = 1960 + i;
                      return <Picker.Item key={y} label={String(y)} value={String(y)} color={gymTheme.colors.text} />;
                    })}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>월</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={month}
                    style={styles.picker}
                    onValueChange={(value) => setMonth(value)}
                    itemStyle={{ color: gymTheme.colors.text }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1;
                      return <Picker.Item key={m} label={String(m)} value={String(m)} color={gymTheme.colors.text} />;
                    })}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>일</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={day}
                    style={styles.picker}
                    onValueChange={(value) => setDay(value)}
                    itemStyle={{ color: gymTheme.colors.text }}
                  >
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = i + 1;
                      return <Picker.Item key={d} label={String(d)} value={String(d)} color={gymTheme.colors.text} />;
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
                style={styles.picker}
                onValueChange={(value) => setGender(value)}
                itemStyle={{ color: gymTheme.colors.text }}
              >
                <Picker.Item label="남성" value="male" color={gymTheme.colors.text} />
                <Picker.Item label="여성" value="female" color={gymTheme.colors.text} />
              </Picker>
            </View>
          </View>

          {/* 회원가입 버튼 */}
          <TouchableOpacity 
            style={[
              styles.signUpButton,
              (!name.trim() || !phone.trim() || !weight.trim() || !height.trim()) ? styles.signUpButtonDisabled : null
            ]} 
            onPress={handleSighUpSubmit}
            disabled={!name.trim() || !phone.trim() || !weight.trim() || !height.trim()}
          >
            <Text style={styles.signUpText}>회원가입 완료</Text>
          </TouchableOpacity>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

SighUpScreen.propTypes = {
  navigation: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  header: {
    backgroundColor: gymTheme.colors.secondary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: gymTheme.spacing.lg,
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: gymTheme.colors.accent,
    letterSpacing: 2,
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
  
  section: {
    marginBottom: gymTheme.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.md,
  },
  
  inputContainer: {
    marginBottom: gymTheme.spacing.md,
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
    backgroundColor: gymTheme.colors.input,
    borderRadius: gymTheme.borderRadius.medium,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
  },
  
  picker: {
    color: gymTheme.colors.text,
  },
  
  signUpButton: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.medium,
    paddingVertical: gymTheme.spacing.lg,
    alignItems: 'center',
    marginTop: gymTheme.spacing.xl,
    ...gymTheme.shadows.medium,
  },
  
  signUpButtonDisabled: {
    backgroundColor: '#555555',
    opacity: 0.5,
  },
  
  signUpText: {
    color: gymTheme.colors.text,
    fontWeight: 'bold',
    fontSize: 18,
  },
  
  errorText: {
    color: gymTheme.colors.error,
    marginTop: gymTheme.spacing.lg,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default SighUpScreen;
