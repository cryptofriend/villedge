// Generate avatar URL based on nickname using DiceBear API
// Returns creative avatars for users

const AVATAR_STYLES = [
  "adventurer",
  "adventurer-neutral", 
  "avataaars",
  "big-ears",
  "big-smile",
  "bottts",
  "croodles",
  "fun-emoji",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "open-peeps",
  "personas",
  "pixel-art",
  "thumbs",
];

// Get a consistent style based on nickname hash
const getStyleForNickname = (nickname: string): string => {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length];
};

// Generate DiceBear avatar URL
export const getAvatarUrl = (nickname: string, size: number = 64): string => {
  const style = getStyleForNickname(nickname);
  const seed = encodeURIComponent(nickname);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=${size}`;
};

// Try to extract avatar from social profile URL
export const getSocialAvatarUrl = (socialUrl: string | null): string | null => {
  if (!socialUrl) return null;
  
  try {
    const url = new URL(socialUrl);
    
    // Twitter/X
    if (url.hostname.includes('twitter.com') || url.hostname.includes('x.com')) {
      const username = url.pathname.split('/').filter(Boolean)[0];
      if (username) {
        // Use unavatar.io which handles Twitter avatars
        return `https://unavatar.io/twitter/${username}`;
      }
    }
    
    // GitHub
    if (url.hostname.includes('github.com')) {
      const username = url.pathname.split('/').filter(Boolean)[0];
      if (username) {
        return `https://github.com/${username}.png?size=128`;
      }
    }
    
    // LinkedIn (can't easily get avatar)
    // Instagram (can't easily get avatar)
    
    return null;
  } catch {
    return null;
  }
};

// Get the best available avatar for a user
export const getBestAvatar = (nickname: string, socialUrl: string | null, size: number = 64): string => {
  const socialAvatar = getSocialAvatarUrl(socialUrl);
  if (socialAvatar) return socialAvatar;
  return getAvatarUrl(nickname, size);
};
