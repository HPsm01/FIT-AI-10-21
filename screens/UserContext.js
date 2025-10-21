// UserContext.js
import { createContext, useState, useEffect, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, InteractionManager, BackHandler } from 'react-native';
import PropTypes from 'prop-types';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const appState = useRef(AppState.currentState);
  const isExiting = useRef(false);
  
  // 타이머 관련 상태
  const [elapsed, setElapsed] = useState('00:00:00');
  const [isWorkingOut, setIsWorkingOut] = useState(false);

  // 앱 시작 시 저장된 로그인 정보 불러오기
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // 타이머 로직
  useEffect(() => {
    if (!user) return;

    const checkWorkoutStatus = async () => {
      try {
        const checkInTime = await AsyncStorage.getItem('checkInTime');
        console.log('🔍 UserContext: checkInTime 확인:', checkInTime);
        
        if (checkInTime) {
          // 입실 기록이 있으면 운동 중으로 설정 (상태가 변경될 때만 로그)
          if (!isWorkingOut) {
            setIsWorkingOut(true);
            console.log('✅ UserContext: 운동 중 상태로 설정됨');
          }
        } else {
          // 입실 기록이 없으면 운동 중 아님으로 설정 (상태가 변경될 때만 로그)
          if (isWorkingOut) {
            setIsWorkingOut(false);
            setElapsed('00:00:00');
            console.log('❌ UserContext: 운동 중 아님 상태로 설정됨');
          }
        }
      } catch (error) {
        console.error('운동 상태 확인 실패:', error);
      }
    };

    checkWorkoutStatus();
    
    // 주기적으로 운동 상태 확인 (10초마다로 변경하여 부하 감소)
    const statusCheckInterval = setInterval(checkWorkoutStatus, 10000);
    
    return () => {
      clearInterval(statusCheckInterval);
    };
  }, [user, isWorkingOut]);

  useEffect(() => {
    if (!isWorkingOut) {
      setElapsed('00:00:00');
      return;
    }

    const timer = setInterval(async () => {
      try {
        const checkInTimeStr = await AsyncStorage.getItem('checkInTime');
        if (checkInTimeStr) {
          const checkInTime = new Date(checkInTimeStr);
          const now = new Date();
          const diff = now - checkInTime;
          
          if (diff < 0) {
            setElapsed('00:00:00');
            return;
          }

          const hours = Math.floor(diff / 3600000);
          const minutes = Math.floor((diff % 3600000) / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          
          const h = String(hours).padStart(2, '0');
          const m = String(minutes).padStart(2, '0');
          const s = String(seconds).padStart(2, '0');
          
          setElapsed(`${h}:${m}:${s}`);
        } else {
          setIsWorkingOut(false);
          setElapsed('00:00:00');
        }
      } catch (error) {
        console.error('타이머 업데이트 실패:', error);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isWorkingOut]);

  // AsyncStorage에서 사용자 정보와 입실 상태 불러오기
  const loadUserFromStorage = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const checkInTime = await AsyncStorage.getItem('checkInTime');
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // 입실 상태 확인
        if (checkInTime) {
          setInitialRoute('CheckOut'); // 이미 입실 중이면 퇴실 화면으로
          console.log('저장된 로그인 정보 + 입실 상태 확인 - 퇴실 화면으로 이동');
        } else {
          setInitialRoute('WorkoutType'); // 로그인되어 있지만 입실하지 않음 - 운동 타입 선택 화면으로
          console.log('저장된 로그인 정보 확인 - 운동 타입 선택 화면으로 이동');
        }
      } else {
        setInitialRoute('Login'); // 로그인되지 않음 - 로그인 화면으로
        console.log('로그인 정보 없음 - 로그인 화면으로 이동');
      }
    } catch (error) {
      console.error('로그인 정보 불러오기 실패:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 정보 저장 (로그인 시)
  const saveUserToStorage = async (userData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      console.log('로그인 정보 저장 성공');
    } catch (error) {
      console.error('로그인 정보 저장 실패:', error);
    }
  };

  // 사용자 정보 삭제 (로그아웃 시)
  const removeUserFromStorage = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      console.log('로그인 정보 삭제 성공');
    } catch (error) {
      console.error('로그인 정보 삭제 실패:', error);
    }
  };

  // 사용자 설정 함수 (로그인 시 사용)
  const loginUser = async (userData) => {
    setUser(userData);
    await saveUserToStorage(userData);
  };

  // 사용자 제거 함수 (로그아웃 시 사용)
  const logoutUser = async () => {
    setUser(null);
    await removeUserFromStorage();
    setInitialRoute('Login'); // 로그아웃 시 로그인 화면으로 이동
    console.log('로그아웃 완료 - 로그인 화면으로 이동');
  };

  // 운동 상태 즉시 업데이트 함수
  const updateWorkoutStatus = async () => {
    try {
      console.log('🔄 UserContext: updateWorkoutStatus 호출됨');
      const checkInTime = await AsyncStorage.getItem('checkInTime');
      console.log('🔄 UserContext: AsyncStorage에서 checkInTime 조회:', checkInTime);
      console.log('🔄 UserContext: 현재 isWorkingOut 상태:', isWorkingOut);
      
      if (checkInTime) {
        if (!isWorkingOut) {
          setIsWorkingOut(true);
          console.log('✅ UserContext: 운동 중 상태로 즉시 업데이트됨');
        } else {
          console.log('ℹ️ UserContext: 이미 운동 중 상태임');
        }
      } else {
        if (isWorkingOut) {
          setIsWorkingOut(false);
          setElapsed('00:00:00');
          console.log('❌ UserContext: 운동 중 아님 상태로 즉시 업데이트됨');
        } else {
          console.log('ℹ️ UserContext: 이미 운동 중 아님 상태임');
        }
      }
    } catch (error) {
      console.error('운동 상태 즉시 업데이트 실패:', error);
    }
  };

  // 앱 상태 변경 감지 및 퇴실 처리
  useEffect(() => {
    if (!user) return;

    let activityTimer;
    let backgroundTimer;
    
    const resetActivityTimer = () => {
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      // 24시간 후 자동 로그아웃 (필요시 조정 가능)
      activityTimer = setTimeout(() => {
        console.log('장시간 비활성으로 인한 자동 로그아웃');
        logoutUser();
      }, 24 * 60 * 60 * 1000); // 24시간
    };

    // 앱 상태 변경 처리
    const handleAppStateChange = async (nextAppState) => {
      console.log('앱 상태 변경:', appState.current, '→', nextAppState);
      
      if (nextAppState === 'active') {
        // 앱이 활성화될 때
        console.log('앱 활성화 - 활동 타이머 리셋');
        resetActivityTimer();
        isExiting.current = false;
        
        // 백그라운드 타이머가 있다면 취소
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
        
        // 앱이 활성화될 때 운동 상태 다시 확인
        try {
          const checkInTime = await AsyncStorage.getItem('checkInTime');
          if (checkInTime) {
            setIsWorkingOut(true);
            console.log('앱 활성화 - 운동 상태 복구됨');
          } else {
            setIsWorkingOut(false);
            setElapsed('00:00:00');
            console.log('앱 활성화 - 운동 상태 없음');
          }
        } catch (error) {
          console.error('앱 활성화 시 운동 상태 확인 실패:', error);
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 앱이 백그라운드로 가거나 비활성화될 때
        if (!isExiting.current) {
          isExiting.current = true;
          console.log('앱 백그라운드/비활성화 - 자동 퇴실 비활성화됨');
          
          // 자동 퇴실 로직 비활성화 (사용자가 수동으로 퇴실하도록 함)
          // backgroundTimer = setTimeout(async () => {
          //   // 자동 퇴실 로직 제거됨
          // }, 30 * 60 * 1000);
        }
      }
    };

    // 사용자 상호작용 감지
    const handleUserInteraction = () => {
      resetActivityTimer();
    };

    // AppState 리스너 등록
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // InteractionManager로 사용자 상호작용 감지
    InteractionManager.runAfterInteractions(() => {
      resetActivityTimer();
    });

    // 초기 타이머 시작
    resetActivityTimer();

    // 클린업
    return () => {
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
      subscription?.remove();
    };
  }, [user]);

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      loginUser, 
      logoutUser, 
      isLoading,
      initialRoute,
      elapsed,
      isWorkingOut,
      updateWorkoutStatus
    }}>
      {children}
    </UserContext.Provider>
  );
};

UserProvider.propTypes = {
  children: PropTypes.node,
};
