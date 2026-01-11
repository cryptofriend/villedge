import { useState } from "react";
import { MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Comment } from "@/hooks/useComments";
import { formatDistanceToNow } from "date-fns";

interface SpotCommentsProps {
  spotId: string;
  comments: Comment[];
  commentCount: number;
  onAddComment: (spotId: string, authorName: string, content: string) => Promise<Comment | null>;
}

export const SpotComments = ({ spotId, comments, commentCount, onAddComment }: SpotCommentsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authorName.trim() || !content.trim()) {
      toast.error("Please enter your name and comment");
      return;
    }

    // Limit comment length for the map layer
    if (content.length > 280) {
      toast.error("Comments must be under 280 characters");
      return;
    }

    setIsSubmitting(true);
    const result = await onAddComment(spotId, authorName.trim(), content.trim());
    setIsSubmitting(false);

    if (result) {
      setContent("");
      toast.success("Comment added!");
    } else {
      toast.error("Failed to add comment");
    }
  };

  return (
    <div className="border-t border-border pt-3">
      {/* Header - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Comment form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="h-8 text-sm"
              maxLength={50}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Share a quick tip..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-8 text-sm flex-1"
                maxLength={280}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !authorName.trim() || !content.trim()}
                className="h-8 px-3"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>

          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.slice(0, 10).map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg bg-muted/50 p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Be the first to share a tip!
            </p>
          )}
        </div>
      )}
    </div>
  );
};
