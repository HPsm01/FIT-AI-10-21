import { useEffect, useState, useRef, useContext } from "react";
import { Camera } from 'expo-camera';
import { AppState, Pressable, Text, View, StyleSheet, Alert, Platform, TouchableOpacity, ActivityIndicator } from "react-native";
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { UserContext } from './UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';

const API_URL = 'http://13.209.67.129:8000';

console.log('Camera:', Camera);
console.log('Camera typeof:', typeof Camera);
console.log('Camera keys:', Object.keys(Camera));

const getInitialCameraType = () => {
  if (Camera && Camera.Constants && Camera.Constants.Type) {
    return Camera.Constants.Type.back;
  }
  return null;
};

export default function ExercisePaper() {
  const { user } = useContext(UserContext);
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);
  const [type, setType] = useState("back");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const appState = useRef(AppState.currentState);
  const alreadyCheckedRef = useRef(false);
  const isFocused = useIsFocused();
  const [canStop, setCanStop] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const s3KeyName = route.params?.s3KeyName;

  // 권한 체크 함수 분리
  const requestAllPermissions = async () => {
    try {
      console.log('권한 요청 시작...');
      
      const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      const { status: pickerStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('카메라 권한:', camStatus);
      console.log('마이크 권한:', micStatus);
      console.log('미디어 권한:', mediaStatus);
      console.log('이미지피커 권한:', pickerStatus);
      
      const allGranted = camStatus === 'granted' &&
        micStatus === 'granted' &&
        mediaStatus === 'granted' &&
        pickerStatus === 'granted';
        
      setHasPermission(allGranted);
      
      if (!allGranted) {
        const missingPermissions = [];
        if (camStatus !== 'granted') missingPermissions.push('카메라');
        if (micStatus !== 'granted') missingPermissions.push('마이크');
        if (mediaStatus !== 'granted') missingPermissions.push('저장소');
        if (pickerStatus !== 'granted') missingPermissions.push('갤러리');
        
        Alert.alert(
          '권한 필요', 
          `${missingPermissions.join(', ')} 권한이 필요합니다. 설정에서 권한을 허용해 주세요.`
        );
      }
    } catch (e) {
      console.error('권한 요청 중 오류:', e);
      Alert.alert('권한 요청 오류', '권한 요청 중 오류가 발생했습니다. 앱을 재시작해 주세요.');
    }
  };

  useEffect(() => {
    if (isFocused) {
      console.log('운동분석지 화면 진입: 권한 요청');
      requestAllPermissions();
    }
  }, [isFocused]);

  // S3 업로드 함수 (pre-signed URL 사용)
  const uploadVideoToS3 = async (uri) => {
    if (!user) throw new Error('로그인 정보가 없습니다.');
    if (!s3KeyName) throw new Error('s3KeyName이 전달되지 않았습니다.');
    // 전달받은 s3KeyName 사용
    const s3Key = `fitvideo/${s3KeyName}`;

    // 1) presign URL 요청
    const presignRes = await fetch(
      `${API_URL}/s3/presign?key=${encodeURIComponent(s3Key)}`
    );
    if (!presignRes.ok) {
      throw new Error('Presign URL 생성 실패');
    }
    const { url } = await presignRes.json();

    // 2) 로컬 파일을 blob으로 가져오기
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    const fileUri = fileInfo.uri;
    const fileBlob = await (await fetch(fileUri)).blob();

    // 3) S3 PUT
    const uploadRes = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: fileBlob,
    });
    if (!uploadRes.ok) {
      throw new Error('S3 업로드 실패');
    }

    return s3Key;
  };

  // 녹화 완료 후 처리
  const startRecording = async () => {
    if (!cameraRef.current) {
      Alert.alert('오류', '카메라가 준비되지 않았습니다.');
      return;
    }
    if (!isCameraReady) {
      Alert.alert('오류', '카메라가 아직 준비되지 않았습니다.');
      return;
    }
    setIsRecording(true);
    setCanStop(false);
    setTimeout(() => setCanStop(true), 1000); // 1초 후 중지 가능
    try {
      console.log('녹화 시작');
      const video = await cameraRef.current.recordAsync({ quality: '720p', maxDuration: 15 });
      setIsRecording(false);
      setCanStop(false);
      console.log('녹화 성공:', video);
      const asset = await MediaLibrary.createAssetAsync(video.uri);
      Alert.alert('녹화 완료', '갤러리에 저장되었습니다.');
      // S3 업로드
      setUploading(true);
      const key = await uploadVideoToS3(asset.uri);
      setUploading(false);
      Alert.alert('업로드 완료', `S3 키: ${key}`);
      navigation.navigate('MyExercise');
    } catch (err) {
      setIsRecording(false);
      setCanStop(false);
      setUploading(false);
      console.error('녹화 또는 업로드 오류:', err);
      Alert.alert('녹화 또는 업로드 오류', err.message || String(err));
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording && canStop) {
      cameraRef.current.stopRecording();
    }
  };

  // 갤러리에서 영상 선택 후 업로드
  const pickVideoFromGallery = async () => {
    try {
      // 권한 재확인
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다. 설정에서 권한을 허용해 주세요.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        try {
          setUploading(true);
          const key = await uploadVideoToS3(uri);
          setUploading(false);
          Alert.alert('업로드 완료', `S3 키: ${key}`);
          navigation.navigate('MyExercise');
        } catch (err) {
          setUploading(false);
          console.error('업로드 오류:', err);
          Alert.alert('업로드 오류', err.message || '업로드 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('ImagePicker 오류:', error);
      Alert.alert('갤러리 접근 오류', '갤러리에서 영상을 선택할 수 없습니다. 권한을 확인해 주세요.');
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>권한 확인 중...</Text></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>카메라, 마이크, 저장소 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.button} onPress={requestAllPermissions}>
          <Text style={styles.text}>권한 요청</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (uploading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6699ee" />
        <Text style={{ color: '#fff', marginTop: 10 }}>업로드 중...</Text>
      </View>
    );
  }

  if (!type) {
    return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>카메라 모듈을 불러오는 중입니다...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={type}
        ref={cameraRef}
        onCameraReady={() => setIsCameraReady(true)}
        ratio="16:9"
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setType(prev => (prev === "back" ? "front" : "back"))}
          >
            <Text style={styles.text}>카메라 전환</Text>
          </TouchableOpacity>

          {isRecording ? (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: canStop ? '#f00' : '#888' }]}
              onPress={stopRecording}
              disabled={!canStop}
            >
              <Text style={styles.text}>녹화 중지</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={startRecording}>
              <Text style={styles.text}>녹화 시작</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={pickVideoFromGallery}>
            <Text style={styles.text}>갤러리</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'
  },
  camera: {
    flex: 1, width: '100%',
  },
  buttonContainer: {
    flex: 1, backgroundColor: 'transparent', flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 30,
  },
  button: {
    backgroundColor: '#ffffff80', padding: 12, borderRadius: 8,
  },
  text: {
    fontSize: 16, color: '#000',
  },
});
