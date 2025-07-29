import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { UserContext } from './UserContext';

export default function ServerDataScreen() {
  const { user } = React.useContext(UserContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 원하는 API 주소로 변경 가능
      const res = await fetch(`http://13.209.67.129:8000/workouts/user`);
      if (!res.ok) throw new Error('서버 응답 오류');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="서버 데이터 불러오기" onPress={fetchData} />
      {loading && <Text style={styles.info}>불러오는 중...</Text>}
      {error && <Text style={styles.error}>에러: {error}</Text>}
      <ScrollView style={styles.scroll}>
        <Text selectable style={styles.jsonText}>{data ? JSON.stringify(data, null, 2) : '데이터 없음'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  scroll: { marginTop: 20 },
  jsonText: { fontFamily: 'monospace', fontSize: 13, color: '#222' },
  info: { marginTop: 10, color: '#888' },
  error: { marginTop: 10, color: 'red' },
}); 