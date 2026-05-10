import { ViewStyle, TextStyle } from "react-native";
type Variant = "primary" | "outline" | "ghost";
export interface ButtonProps {
    title: string;
    onPress?: () => void;
    variant?: Variant;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare function Button({ title, onPress, variant, disabled, loading, style, textStyle, }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map