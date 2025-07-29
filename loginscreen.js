import { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import PropTypes from 'prop-types';
import { UserContext } from "./screens/UserContext";

const LoginScreen = ({ navigation }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useContext(UserContext); // UserContext에서 setUser 가져오기

  const handleLogin = async () => {
    if (!id.trim() || !password.trim()) {
      Alert.alert("오류", "아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      // 로그인 API 호출
      const response = await fetch('http://13.209.67.129:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: id,
          password: password
        })
      });

      if (response.ok) {
        const userData = await response.json();
        
        // 사용자 정보를 UserContext에 저장
        setUser({
          id: userData.id,
          username: userData.username,
          name: userData.name,
          // 기타 필요한 사용자 정보들
        });

        // 로그인 성공 시 CheckIn 화면으로 이동
        navigation.navigate('CheckIn');
      } else {
        const errorData = await response.json();
        Alert.alert("로그인 실패", errorData.detail || "아이디 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      Alert.alert("오류", "로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleCancel = () => {
    // 취소 버튼 클릭 시 입력 필드 초기화
    setId("");
    setPassword("");
  };

  return (
    <View style={styles.container}>
      {/* 헤더 영역 */}
      <View style={styles.header}>
        <Text style={styles.headerText}>로그인</Text>
        <TouchableOpacity style={styles.signupButton} onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.signupText}>회원가입</Text>
        </TouchableOpacity>
      </View>

      {/* 입력 필드 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>아이디 :</Text>
        <TextInput
          style={styles.input}
          placeholder="아이디 입력"
          value={id}
          onChangeText={setId}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>패스워드 :</Text>
        <TextInput
          style={styles.input}
          placeholder="비밀번호 입력"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleLogin}>
          <Text style={styles.buttonText}>확인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

LoginScreen.propTypes = {
  navigation: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D7E7F3",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  signupButton: {
    backgroundColor: "#FFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  signupText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  confirmButton: {
    backgroundColor: "#5B90F6",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#000",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default LoginScreen;
