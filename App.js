import { useContext } from "react";
import { UserProvider, UserContext } from "./screens/UserContext";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { gymTheme } from "./styles/theme";

import LoginScreen from "./screens/LoginScreen"; 
import CheckInScreen from "./screens/CheckInScreen";
import CheckOutScreen from "./screens/CheckOutScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ExercisePaper from "./screens/ExercisePaper";
import SignUpScreen from "./screens/SignUpScreen";
import MyExerciseScreen from "./screens/MyExercise";
import TotalExerciseScreen from "./screens/TotalExercise";
import ServerDataScreen from "./screens/ServerDataScreen";
import EditProfileScreen from "./screens/EditProfileScreen";

const Stack = createStackNavigator();

// 딥링크 설정 추가
const linking = {
  prefixes: ["feapp://"],
  config: {
    screens: {
      Login: "login",
      SignUp: "signup",
      CheckIn: "checkin",
      CheckOut: "checkout",
      Profile: "profile",
      MyExercise: "myexercise",
      ExercisePaper: "exercisepaper",
      TotalExercise: "totalexercise"
    }
  }
};

// 헬스장 테마 네비게이션 스타일
const screenOptions = {
  headerStyle: {
    backgroundColor: gymTheme.colors.secondary,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTintColor: gymTheme.colors.text,
  headerTitleStyle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerTitleAlign: 'center',
  cardStyle: {
    backgroundColor: gymTheme.colors.primary,
  },
};

function AppNavigator() {
  const { initialRoute, isLoading } = useContext(UserContext);
  
  if (isLoading) {
    return null; // 로딩 중에는 아무것도 표시하지 않음
  }
  
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator 
        key={initialRoute} // initialRoute가 변경될 때마다 네비게이션 재초기화
        initialRouteName={initialRoute}
        screenOptions={screenOptions}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            title: "로그인",
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen} 
          options={{ title: "회원 가입" }}
        />
        <Stack.Screen 
          name="CheckIn" 
          component={CheckInScreen} 
          options={{ title: "입실" }} 
        />
        <Stack.Screen 
          name="CheckOut" 
          component={CheckOutScreen} 
          options={{ title: "퇴실" }} 
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ title: "내 정보" }} 
        />
        <Stack.Screen 
          name="MyExercise" 
          component={MyExerciseScreen} 
          options={{ 
            title: "운동 기록",
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="ServerData" 
          component={ServerDataScreen} 
          options={{ title: "서버 데이터" }} 
        />
        <Stack.Screen 
          name="ExercisePaper" 
          component={ExercisePaper} 
          options={{ title: "운동 분석지" }} 
        />
        <Stack.Screen 
          name="TotalExercise" 
          component={TotalExerciseScreen} 
          options={{ title: "전체 운동 기록" }} 
        />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen} 
          options={{ title: "내 정보 수정" }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
}
