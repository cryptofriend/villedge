import { useState } from "react";
import { Comment, CommentInput } from "@/hooks/useComments";
import { Plus, Send, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Generate a consistent avatar color based on name
const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-amber-500",
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

interface SpotCommentsProps {
  spotId: string;
  comments: Comment[];
  loading: boolean;
  onAddComment: (input: CommentInput) => Promise<Comment | null>;
}

export const SpotComments = ({
  spotId,
  comments,
  loading,
  onAddComment,
}: SpotCommentsProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [authorName, setAuthorName] = useState(() => 
    localStorage.getItem("comment_author_name") || ""
  );
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !authorName.trim()) return;

    setSubmitting(true);
    localStorage.setItem("comment_author_name", authorName.trim());
    
    const result = await onAddComment({
      spot_id: spotId,
      author_name: authorName.trim(),
      content: content.trim(),
    });

    if (result) {
      setContent("");
      setIsAdding(false);
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border/50">
      {/* Comments list */}
      {comments.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto px-4 py-3">
          <div className="space-y-3">
            {comments.slice(0, 5).map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-medium ${getAvatarColor(comment.author_name)}`}
                >
                  {comment.author_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">
                    {comment.content}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {comment.author_name} · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {comments.length > 5 && (
            <p className="mt-2 text-xs text-muted-foreground text-center">
              +{comments.length - 5} more notes
            </p>
          )}
        </div>
      )}

      {/* Add note form */}
      {isAdding ? (
        <div className="border-t border-border/50 p-3 space-y-2">
          {!localStorage.getItem("comment_author_name") && (
            <input
              type="text"
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus={!!localStorage.getItem("comment_author_name")}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim() || !authorName.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setContent("");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add note
          </button>
        </div>
      )}
    </div>
  );
};
