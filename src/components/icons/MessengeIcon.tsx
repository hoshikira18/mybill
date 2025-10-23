import React from "react";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

interface MessengeIconProps {
  size?: number;
  color?: string;
  style?: object;
}

const MessengeIcon: React.FC<MessengeIconProps> = ({
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
          d="M16 10.5h.01m-4.01 0h.01M8 10.5h.01M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-6.6a1 1 0 0 0-.69.275l-2.866 2.723A.5.5 0 0 1 8 18.635V17a1 1 0 0 0-1-1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

export default MessengeIcon;
