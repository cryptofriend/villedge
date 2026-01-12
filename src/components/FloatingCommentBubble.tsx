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
      flex-direction: column;
      align-items: center;
      pointer-events: auto;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(255, 255, 255, 0.97);
        padding: 4px 8px 4px 4px;
        border-radius: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        cursor: pointer;
        max-width: 200px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        <div style="
          width: 20px;
          height: 20px;
          min-width: 20px;
          background: ${avatarColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: 500;
        ">${initial}</div>
        <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 3px;">
          <span style="
            font-size: 11px;
            color: #1a1a1a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100px;
            line-height: 1.2;
          ">${truncatedContent}</span>
          <span style="
            font-size: 9px;
            color: #999;
            white-space: nowrap;
          ">· ${timeAgo}</span>
        </div>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid rgba(255, 255, 255, 0.97);
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
      "></div>
    </div>
  `;
};
