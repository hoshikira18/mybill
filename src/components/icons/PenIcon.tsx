import React from "react";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

interface PenIconProps {
  size?: number;
  color?: string;
  style?: object;
}

const PenIcon: React.FC<PenIconProps> = ({
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
          d="M10.779 17.779 4.36 19.918 6.5 13.5m4.279 4.279 8.364-8.643a3.027 3.027 0 0 0-2.14-5.165 3.03 3.03 0 0 0-2.14.886L6.5 13.5m4.279 4.279L6.499 13.5m2.14 2.14 6.213-6.504M12.75 7.04 17 11.28"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

export default PenIcon;
