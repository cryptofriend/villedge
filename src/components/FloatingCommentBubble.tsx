import { Comment } from "@/hooks/useComments";

// Compact time format: "1min ago", "2h ago", "3d ago"
const formatCompactTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Generate consistent avatar color based on name
const getAvatarColorHex = (name: string): string => {
  const colors = [
    "#f59e0b", // amber-500
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
    "#8b5cf6", // purple-500
    "#ec4899", // pink-500
    "#f97316", // orange-500
    "#14b8a6", // teal-500
    "#6366f1", // indigo-500
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

export const createFloatingCommentHTML = (comment: Comment): string => {
  const avatarColor = getAvatarColorHex(comment.author_name);
  const timeAgo = formatCompactTime(new Date(comment.created_at));
  const initial = comment.author_name.charAt(0).toUpperCase();
  
  // Truncate content to ~30 chars
  const truncatedContent = comment.content.length > 35 
    ? comment.content.substring(0, 35) + "…" 
    : comment.content;

  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(250, 248, 245, 0.95);
      padding: 6px 10px 6px 6px;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      cursor: pointer;
      max-width: 220px;
      pointer-events: auto;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    ">
      <div style="
        width: 22px;
        height: 22px;
        min-width: 22px;
        background: ${avatarColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: 500;
      ">${initial}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 12px;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        ">${truncatedContent}</div>
        <div style="
          font-size: 10px;
          color: #888;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span style="font-weight: 500;">${comment.author_name}</span>
          <span>·</span>
          <span>${timeAgo}</span>
        </div>
      </div>
    </div>
  `;
};
