import React from "react";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

interface MicIconProps {
  size?: number;
  color?: string;
  style?: object;
}

const MicIcon: React.FC<MicIconProps> = ({
  size = 24,
  color = "#FFFFFF",
  style = {},
}) => {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
      >
        <Path
          d="M19 9v3a5.006 5.006 0 0 1-5 5h-4a5.006 5.006 0 0 1-5-5V9m7 9v3m-3 0h6M11 3h2a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

export default MicIcon;
