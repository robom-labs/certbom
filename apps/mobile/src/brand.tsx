// 로봄 패밀리 정본의 봄 획과 선형 메뉴 아이콘을 네이티브 화면에 재사용한다.
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

export function BomMark({ width = 58 }: { width?: number }) {
  return (
    <Svg accessibilityElementsHidden height={width * 0.6} importantForAccessibility="no" viewBox="0 0 200 120" width={width}>
      <G fill="none" stroke="#1d3047" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10">
        <Path d="M28 8V46M72 8V46M28 28H72M28 46H72M10 64H142M50 64V47M28 76H72V110H28Z" />
      </G>
      <G fill="#4058d8">
        <G transform="translate(148 60) scale(1.8)">
          {["-2", "74", "142", "218", "286"].map((rotate) => (
            <Path
              d="M0-1.4C-4.6-1.8-6-6.2-3.7-9.2-2.5-10.7-1.2-9.4 0-7.7 1.2-9.4 2.5-10.7 3.7-9.2 6-6.2 4.6-1.8 0-1.4Z"
              key={rotate}
              transform={`rotate(${rotate})`}
            />
          ))}
          <Circle cx="0" cy="0" fill="#fffefb" r="2.4" />
        </G>
        <Path d="M0-1.4C-4.6-1.8-6-6.2-3.7-9.2-2.5-10.7-1.2-9.4 0-7.7 1.2-9.4 2.5-10.7 3.7-9.2 6-6.2 4.6-1.8 0-1.4Z" transform="translate(96 58) rotate(15)" />
        <Path d="M0-1.4C-4.6-1.8-6-6.2-3.7-9.2-2.5-10.7-1.2-9.4 0-7.7 1.2-9.4 2.5-10.7 3.7-9.2 6-6.2 4.6-1.8 0-1.4Z" transform="translate(120 52) rotate(-20) scale(1.1)" />
        <Path d="M0-1.4C-4.6-1.8-6-6.2-3.7-9.2-2.5-10.7-1.2-9.4 0-7.7 1.2-9.4 2.5-10.7 3.7-9.2 6-6.2 4.6-1.8 0-1.4Z" transform="translate(164 46) rotate(50) scale(1.3)" />
        <Path d="M0-1.4C-4.6-1.8-6-6.2-3.7-9.2-2.5-10.7-1.2-9.4 0-7.7 1.2-9.4 2.5-10.7 3.7-9.2 6-6.2 4.6-1.8 0-1.4Z" transform="translate(172 62) rotate(80) scale(1.1)" />
      </G>
    </Svg>
  );
}

export type NativeIconName = "home" | "search" | "calendar" | "bell" | "settings" | "back" | "external";

export function NativeIcon({ color = "#5f6882", name, size = 24 }: { color?: string; name: NativeIconName; size?: number }) {
  const common = { fill: "none", stroke: color, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8 };
  return (
    <Svg accessibilityElementsHidden height={size} importantForAccessibility="no" viewBox="0 0 24 24" width={size}>
      {name === "home" && <Path {...common} d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3Z" />}
      {name === "search" && <><Circle {...common} cx="10.5" cy="10.5" r="6.5" /><Path {...common} d="m15.5 15.5 5 5" /></>}
      {name === "calendar" && <><Rect {...common} height="16" rx="3" width="18" x="3" y="5" /><Path {...common} d="M8 3v4m8-4v4M3 10h18M8 14h.01m4 0h.01m4 0h.01M8 18h.01m4 0h.01" /></>}
      {name === "bell" && <Path {...common} d="M5 18h14l-2-3V10a5 5 0 0 0-10 0v5Zm5 3h4" />}
      {name === "settings" && <><Circle {...common} cx="12" cy="12" r="3" /><Path {...common} d="M19.4 15a8 8 0 0 0 .1-6l2-1.2-2-3.4-2.1 1.2a8 8 0 0 0-5.2-3V1h-4v1.4a8 8 0 0 0-4.9 3L1.2 4.2l-2 3.4L1.4 9a8 8 0 0 0 0 6l-2.2 1.2 2 3.4 2.1-1.2a8 8 0 0 0 4.9 3V23h4v-1.4a8 8 0 0 0 5.2-3l2.1 1.2 2-3.4Z" transform="scale(.76) translate(3.8 3.8)" /></>}
      {name === "back" && <Path {...common} d="m15 5-7 7 7 7" />}
      {name === "external" && <Path {...common} d="M14 4h6v6m0-6-9 9M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />}
    </Svg>
  );
}
