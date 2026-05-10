import { TextInputProps, ViewStyle } from "react-native";
export interface InputFieldProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}
export declare function InputField({ label, error, containerStyle, style, ...rest }: InputFieldProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=InputField.d.ts.map