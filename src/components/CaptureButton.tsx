import React, { useEffect, useRef } from "react";
import {
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";

interface CaptureButtonProps {
  selectedImage?: string | null;
  loading: boolean;
  onPress: (event?: GestureResponderEvent) => void;
}

export default function CaptureButton({
  selectedImage,
  loading,
  onPress,
}: CaptureButtonProps) {
  const borderAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loading) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: false,
          }),
          Animated.timing(borderAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: false,
          }),
        ])
      );
      loopRef.current.start();
    } else {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
    };
  }, [loading, borderAnim]);

  const animatedBorderWidth = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 10],
  });

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,107,53,0.6)", "rgba(255,107,53,1)"],
  });

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  const animatedStyle = {
    borderWidth: animatedBorderWidth,
    borderColor: animatedBorderColor,
  } as any;

  return (
    <AnimatedTouchable
      style={[styles.captureButton, loading ? animatedStyle : undefined]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text style={styles.text}>
        {loading ? "Đang xử lý..." : selectedImage ? "Nhập" : "Chụp"}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  captureButton: {
    width: "50%",
    paddingVertical: 16,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FF6B35",
  },
  text: {
    fontSize: 18,
    fontWeight: "700",
  },
});
