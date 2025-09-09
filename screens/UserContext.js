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
        if (checkInTime) {
          setIsWorkingOut(true);
          console.log('운동 중 - 타이머 시작');
        } else {
          setIsWorkingOut(false);
          setElapsed('00:00:00');
          console.log('운동 중 아님 - 타이머 정지');
        }
      } catch (error) {
        console.error('운동 상태 확인 실패:', error);
      }
    };

    checkWorkoutStatus();
  }, [user]);

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
          setInitialRoute('CheckIn'); // 로그인되어 있지만 입실하지 않음 - 입실 화면으로
          console.log('저장된 로그인 정보 확인 - 입실 화면으로 이동');
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
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 앱이 백그라운드로 가거나 비활성화될 때
        if (!isExiting.current) {
          isExiting.current = true;
          console.log('앱 백그라운드/비활성화 - 5분 후 자동 퇴실 예약');
          
          // 5분 후 자동 퇴실 처리 (즉시 퇴실하지 않음)
          backgroundTimer = setTimeout(async () => {
            try {
              // 입실 상태 확인
              const checkInTime = await AsyncStorage.getItem('checkInTime');
              if (checkInTime) {
                console.log('5분 경과 - 자동 퇴실 처리');
                
                // 퇴실 API 호출
                const payload = {
                  user_id: user.id,
                  check_out: new Date().toISOString(),
                };
                
                const response = await fetch('http://13.209.67.129:8000/visits/checkout', {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                
                if (response.ok) {
                  // 퇴실 성공 시 checkInTime 제거
                  await AsyncStorage.removeItem('checkInTime');
                  console.log('자동 퇴실 처리 완료');
                  // 퇴실 후 로그인 화면으로 이동
                  setInitialRoute('Login');
                } else {
                  console.log('자동 퇴실 API 호출 실패');
                }
              } else {
                console.log('입실하지 않은 상태 - 퇴실 처리 불필요');
              }
            } catch (error) {
              console.error('자동 퇴실 처리 중 오류:', error);
            }
          }, 5 * 60 * 1000); // 5분 후
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
      isWorkingOut
    }}>
      {children}
    </UserContext.Provider>
  );
};

UserProvider.propTypes = {
  children: PropTypes.node,
};
