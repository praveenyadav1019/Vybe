/**
 * Prebuilt, hosted avatars (DiceBear) shared across the photo-upload and
 * onboarding photo steps. Deterministic + no upload needed — the URL is
 * persisted on the profile exactly like an uploaded photo.
 */
const AVATAR_BG = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,ede9fe';

function avatar(style: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=512&backgroundColor=${AVATAR_BG}`;
}

export const AVATARS: string[] = [
  avatar('adventurer', 'Vybe1'),  avatar('adventurer', 'Vybe2'),
  avatar('avataaars', 'Vybe3'),   avatar('avataaars', 'Vybe4'),
  avatar('notionists', 'Vybe5'),  avatar('notionists', 'Vybe6'),
  avatar('lorelei', 'Vybe7'),     avatar('lorelei', 'Vybe8'),
  avatar('micah', 'Vybe9'),       avatar('micah', 'Vybe10'),
  avatar('personas', 'Vybe11'),   avatar('personas', 'Vybe12'),
];

/** True when a photo entry is a prebuilt/hosted avatar (already a URL). */
export function isRemotePhoto(uri: string): boolean {
  return /^https?:\/\//.test(uri);
}
