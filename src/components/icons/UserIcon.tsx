import React from "react";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

interface UserIconProps {
  size?: number;
  color?: string;
  style?: object;
}

const UserIcon: React.FC<UserIconProps> = ({
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
          d="M7 17v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3Zm8-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

export default UserIcon;
