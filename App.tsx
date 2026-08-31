import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

// নেটিভ স্প্ল্যাশ স্ক্রিন অটো হাইড হওয়া বন্ধ রাখা
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // এখানে প্রয়োজনীয় প্রি-লোড (Fonts, Auth Check ইত্যাদি) করতে পারেন
        await new Promise((resolve) => setTimeout(resolve, 1500)); // স্প্ল্যাশ কতক্ষণ দেখাবে
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // মেইন অ্যাপ রেডি হওয়ার সাথে সাথে স্প্ল্যাশ হাইড হবে
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#ffffff" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}