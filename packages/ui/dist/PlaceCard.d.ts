import { ViewStyle } from "react-native";
export interface PlaceCardProps {
    name: string;
    category: string;
    activeUsers: number;
    vibeScore: number;
    onPress?: () => void;
    style?: ViewStyle;
}
export declare function PlaceCard({ name, category, activeUsers, vibeScore, onPress, style, }: PlaceCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PlaceCard.d.ts.map