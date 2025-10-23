import React from "react";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

interface ImageIconProps {
  size?: number;
  color?: string;
  style?: object;
}

const ImageIcon: React.FC<ImageIconProps> = ({
  size = 24,
  color = "#FFFFFF",
  style = {},
}) => {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path
          fillRule="evenodd"
          d="M13 10a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H14a1 1 0 0 1-1-1Z"
          clipRule="evenodd"
        />
        <Path
          fillRule="evenodd"
          d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12c0 .556-.227 1.06-.593 1.422A.999.999 0 0 1 20.5 20H4a2.002 2.002 0 0 1-2-2V6Zm6.892 12 3.833-5.356-3.99-4.322a1 1 0 0 0-1.549.097L4 12.879V6h16v9.95l-3.257-3.619a1 1 0 0 0-1.557.088L11.2 18H8.892Z"
          clipRule="evenodd"
        />
      </Svg>
    </View>
  );
};

export default ImageIcon;
