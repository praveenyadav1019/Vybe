import { ViewStyle } from "react-native";
export type BottomNavKey = "home" | "radar" | "chat" | "places" | "profile";
export interface BottomNavItem {
    key: BottomNavKey;
    label: string;
    icon: string;
}
export interface BottomNavProps {
    items: BottomNavItem[];
    active: BottomNavKey;
    onChange: (key: BottomNavKey) => void;
    style?: ViewStyle;
}
export declare function BottomNav({ items, active, onChange, style }: BottomNavProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=BottomNav.d.ts.map