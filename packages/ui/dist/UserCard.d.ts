import { ViewStyle } from "react-native";
import type { DistanceBucket } from "@vybeon/types";
export interface UserCardProps {
    name: string;
    subtitle?: string;
    photoUrl?: string;
    verified?: boolean;
    distanceBucket?: DistanceBucket;
    venueLabel?: string;
    onPress?: () => void;
    style?: ViewStyle;
}
export declare function UserCard({ name, subtitle, photoUrl, verified, distanceBucket, venueLabel, onPress, style, }: UserCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=UserCard.d.ts.map