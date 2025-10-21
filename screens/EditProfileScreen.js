import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, ScrollView } from 'react-native';
import { UserContext } from './UserContext';
import { gymTheme, gymStyles } from '../styles/theme';
import CommonHeader from './CommonHeader';

const API_URL = 'http://13.209.67.129:8000';

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);
  const [name, setName] = useState(user?.name || '');
  const [height, setHeight] = useState(user?.height_cm?.toString() || '');
  const [weight, setWeight] = useState(user?.weight_kg?.toString() || '');
  const [birth, setBirth] = useState(user?.birth || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [loading, setLoading] = useState(false);

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

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('오류', '사용자 정보가 없습니다.');
      return;
    }
    setLoading(true);
    try {
      // 전화번호에서 하이픈 제거
      const phoneWithoutHyphens = phone.replace(/-/g, '');

      // 1. 기본 정보 PATCH
      const userRes = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name,
          phonenumber: phoneWithoutHyphens,
          birthday: birth,
          gender,
        }),
      });
      if (!userRes.ok) {
        const err = await userRes.text();
        throw new Error('기본 정보 수정 실패: ' + err);
      }

      // 2. 신체 정보 POST (← 기존 PATCH → POST 로 수정!)
      const bodyRes = await fetch(`${API_URL}/body/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          height_cm: parseFloat(height),
          weight_kg: parseFloat(weight),
        }),
      });
      if (!bodyRes.ok) {
        const err = await bodyRes.text();
        throw new Error('신체 정보 수정 실패: ' + err);
      }

      // 저장 성공 후 최신 정보 fetch 및 setUser
      const updatedUserRes = await fetch(`${API_URL}/users/${user.id}`);
      if (updatedUserRes.ok) {
        const updatedUser = await updatedUserRes.json();
        setUser(updatedUser);
      }
      Alert.alert('저장 완료', '내 정보가 저장되었습니다.', [
        { text: '확인', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
      ]);
    } catch (e) {
      Alert.alert('오류', e.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={gymTheme.colors.primary} />
      
      {/* 공통 헤더 */}
      <CommonHeader 
        navigation={navigation}
        title="내 정보 수정"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 기본 정보 섹션 */}
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
            <Text style={styles.label}>생년월일</Text>
            <TextInput 
              style={styles.input} 
              placeholder="YYYY-MM-DD" 
              placeholderTextColor={gymTheme.colors.textMuted}
              value={birth} 
              onChangeText={setBirth} 
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>연락처</Text>
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

        {/* 신체 정보 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>신체 정보</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputContainerHalf}>
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
            
            <View style={styles.inputContainerHalf}>
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

        {/* 저장 버튼 */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave} 
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? '저장 중...' : '저장하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gymTheme.colors.primary,
  },
  
  scrollView: {
    flex: 1,
  },
  
  content: {
    padding: gymTheme.spacing.lg,
  },
  
  section: {
    backgroundColor: gymTheme.colors.card,
    borderRadius: gymTheme.borderRadius.large,
    padding: gymTheme.spacing.lg,
    marginBottom: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.lg,
    textAlign: 'center',
  },
  
  inputContainer: {
    marginBottom: gymTheme.spacing.lg,
  },
  
  inputContainerHalf: {
    flex: 1,
    marginBottom: gymTheme.spacing.lg,
  },
  
  inputRow: {
    flexDirection: 'row',
    gap: gymTheme.spacing.md,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: gymTheme.colors.text,
    marginBottom: gymTheme.spacing.sm,
  },
  
  input: {
    backgroundColor: gymTheme.colors.surface,
    borderRadius: gymTheme.borderRadius.medium,
    paddingHorizontal: gymTheme.spacing.md,
    paddingVertical: gymTheme.spacing.md,
    borderWidth: 1,
    borderColor: gymTheme.colors.border,
    color: gymTheme.colors.text,
    fontSize: 16,
  },
  
  saveButton: {
    backgroundColor: gymTheme.colors.accent,
    borderRadius: gymTheme.borderRadius.medium,
    paddingVertical: gymTheme.spacing.lg,
    alignItems: 'center',
    marginTop: gymTheme.spacing.lg,
    ...gymTheme.shadows.medium,
  },
  
  saveButtonDisabled: {
    backgroundColor: gymTheme.colors.textMuted,
  },
  
  saveButtonText: {
    color: gymTheme.colors.text,
    fontWeight: 'bold',
    fontSize: 18,
  },
  
});
