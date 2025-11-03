import React from "react";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

interface CameraIconProps {
  size?: number;
  color?: string;
  style?: object;
}

const CameraIcon: React.FC<CameraIconProps> = ({
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
          d="M4 18V8a1 1 0 0 1 1-1h1.5l1.707-1.707A1 1 0 0 1 8.914 5h6.172a1 1 0 0 1 .707.293L17.5 7H19a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <Path
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

export default CameraIcon;
