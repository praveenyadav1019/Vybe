import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';

interface VLogoProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * VYBEON "V" brand mark.
 * SVG polygon recreating the exact shape from the splash reference image.
 * Gradient: #9333EA (top-left) → #C084FC (bottom-right).
 */
export function VLogo({ size = 88, style }: VLogoProps) {
  // Maintain 80:68 aspect ratio from the reference
  const width  = size;
  const height = Math.round(size * (68 / 80));

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 80 68">
        <Defs>
          <SvgGrad id="vgrad" x1="10%" y1="0%" x2="90%" y2="100%">
            <Stop offset="0%"   stopColor="#9333EA" />
            <Stop offset="100%" stopColor="#C084FC" />
          </SvgGrad>
        </Defs>

        {/*
          V polygon path (reference-accurate):
          - Left outer arm:  top-left  (2,0)  → bottom-tip (40,68)
          - Right outer arm: top-right (78,0) → bottom-tip (40,68)
          - Left inner edge: (15,0)  → inner-valley (40,50)
          - Right inner edge:(65,0)  → inner-valley (40,50)
          Vertices (CW): TL-outer, TL-inner, valley, TR-inner, TR-outer, tip
        */}
        <Path
          d="M 2,0 L 16,0 L 40,50 L 64,0 L 78,0 L 40,68 Z"
          fill="url(#vgrad)"
        />
      </Svg>
    </View>
  );
}
