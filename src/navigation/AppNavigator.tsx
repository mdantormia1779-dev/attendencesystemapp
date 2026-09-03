import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator } from "react-native";

// Main Tab Bar
import MainTabNavigator from "./MainTabNavigator";

// Sub / Stack Screens
import LoginScreen from "../screens/auth/LoginScreen";
import CheckInScreen from "../screens/attendance/CheckInScreen";
import AttendanceHistoryScreen from "../screens/attendance/AttendanceHistoryScreen";
import LeavesScreen from "../screens/leaves/LeavesScreen";
import ApplyLeaveScreen from "../screens/leaves/ApplyLeaveScreen";
import SalaryScreen from "../screens/salary/SalaryScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import FaceRegisterScreen from "../screens/profile/FaceRegisterScreen";
import IDCardScreen from "../screens/profile/IDCardScreen";
import ReferralsScreen from "../screens/referrals/ReferralsScreen";
import TasksScreen from "../screens/tasks/TasksScreen";
import TaskDetailsScreen from "../screens/tasks/TaskDetailsScreen";
import FaceVerificationScreen from "../screens/face/FaceVerificationScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" }}>
        <ActivityIndicator size="large" color="#00B050" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          {/* Main App with Bottom Navigation */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          {/* Modal / Push Screens */}
          <Stack.Screen name="CheckIn" component={CheckInScreen} />
          <Stack.Screen name="History" component={AttendanceHistoryScreen} />
          <Stack.Screen name="Leaves" component={LeavesScreen} />
          <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
          <Stack.Screen name="Salary" component={SalaryScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="FaceRegistration" component={FaceRegisterScreen} />
          <Stack.Screen name="FaceVerification" component={FaceVerificationScreen} />
          <Stack.Screen name="IDCard" component={IDCardScreen} />
          <Stack.Screen name="Referrals" component={ReferralsScreen} />
          <Stack.Screen name="Tasks" component={TasksScreen} />
          <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

