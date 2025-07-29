import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { UserContext } from './UserContext';

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

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('오류', '사용자 정보가 없습니다.');
      return;
    }
    setLoading(true);
    try {
      // 1. 기본 정보 PATCH
      const userRes = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name,
          phonenumber: phone,
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
      <Text style={styles.header}>내 정보 수정</Text>
      <TextInput style={styles.input} placeholder="이름" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="키(cm)" value={height} onChangeText={setHeight} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="몸무게(kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="생년월일(YYYY-MM-DD)" value={birth} onChangeText={setBirth} />
      <TextInput style={styles.input} placeholder="연락처" value={phone} onChangeText={setPhone} />
      {/* 성별 입력 필드 추가를 원한다면 여기에 Picker 또는 TextInput 추가 가능 */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? '저장 중...' : '저장'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f8fa', alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  input: { width: '90%', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#ccc' },
  saveButton: { backgroundColor: '#6699ee', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 8, marginTop: 20 },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});
