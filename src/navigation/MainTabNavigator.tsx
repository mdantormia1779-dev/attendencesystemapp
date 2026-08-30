import { Platform } from "react-native";
import * as NativeIcons from "lucide-react-native";
import * as WebIcons from "lucide-react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';

const { Home, Clock, CalendarDays, Wallet, User } = Platform.OS === "web" ? WebIcons : NativeIcons;

// Screen imports
import HomeScreen from "../screens/home/HomeScreen";
import AttendanceHistoryScreen from "../screens/attendance/AttendanceHistoryScreen";
import LeavesScreen from "../screens/leaves/LeavesScreen";
import SalaryScreen from "../screens/salary/SalaryScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#00B050",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 8,
          elevation: 10,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabContainer]}>
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="AttendanceTab"
        component={AttendanceHistoryScreen}
        options={{
          tabBarLabel: "Attendance",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabContainer]}>
              <Clock size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="LeavesTab"
        component={LeavesScreen}
        options={{
          tabBarLabel: "Leaves",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabContainer]}>
              <CalendarDays size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="SalaryTab"
        component={SalaryScreen}
        options={{
          tabBarLabel: "Salary",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabContainer]}>
              <Wallet size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabContainer]}>
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  activeTabContainer: {
    transform: [{ scale: 1.05 }],
  },
});
