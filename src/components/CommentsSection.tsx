import { useState } from "react";
import { Comment, CommentInput, useComments } from "@/hooks/useComments";
import { MessageCircle, Send, Reply, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CommentsSectionProps {
  spotId: string;
  commentCount?: number;
  onCommentAdded?: () => void;
}

export const CommentsSection = ({ spotId, commentCount = 0, onCommentAdded }: CommentsSectionProps) => {
  const { comments, loading, addComment, deleteComment } = useComments(spotId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (parentId?: string | null) => {
    if (!authorName.trim() || !content.trim()) {
      toast.error("Please fill in your name and comment");
      return;
    }

    setIsSubmitting(true);
    const success = await addComment({
      spot_id: spotId,
      parent_id: parentId || null,
      author_name: authorName.trim(),
      content: content.trim(),
    });

    if (success) {
      toast.success("Comment added!");
      setContent("");
      setReplyingTo(null);
      setShowForm(false);
      onCommentAdded?.();
    } else {
      toast.error("Failed to add comment");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const success = await deleteComment(commentId);
    if (success) {
      toast.success("Comment deleted");
      onCommentAdded?.();
    } else {
      toast.error("Failed to delete comment");
    }
  };

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <div className="border-t border-border">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span>{totalComments || commentCount} {(totalComments || commentCount) === 1 ? "Review" : "Reviews"}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Add comment button */}
          {!showForm && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-3"
              onClick={() => setShowForm(true)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Add a Review
            </Button>
          )}

          {/* Comment form */}
          {showForm && !replyingTo && (
            <div className="mb-4 space-y-2 bg-secondary/30 p-3 rounded-lg">
              <Input
                placeholder="Your name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="text-sm"
              />
              <Textarea
                placeholder="Write your review..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="text-sm min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSubmit(null)}
                  disabled={isSubmitting}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Post
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Comments list */}
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Loading reviews...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No reviews yet. Be the first!
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={(id) => {
                    setReplyingTo(id);
                    setShowForm(false);
                  }}
                  onDelete={handleDelete}
                  replyingTo={replyingTo}
                  authorName={authorName}
                  setAuthorName={setAuthorName}
                  content={content}
                  setContent={setContent}
                  onSubmitReply={handleSubmit}
                  onCancelReply={() => setReplyingTo(null)}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  replyingTo: string | null;
  authorName: string;
  setAuthorName: (name: string) => void;
  content: string;
  setContent: (content: string) => void;
  onSubmitReply: (parentId: string) => void;
  onCancelReply: () => void;
  isSubmitting: boolean;
  isReply?: boolean;
}

const CommentItem = ({
  comment,
  onReply,
  onDelete,
  replyingTo,
  authorName,
  setAuthorName,
  content,
  setContent,
  onSubmitReply,
  onCancelReply,
  isSubmitting,
  isReply = false,
}: CommentItemProps) => {
  return (
    <div className={isReply ? "ml-6 pl-3 border-l-2 border-border" : ""}>
      <div className="bg-secondary/50 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-foreground">
                {comment.author_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>
          <button
            onClick={() => onDelete(comment.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
            aria-label="Delete comment"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Reply button */}
        {!isReply && (
          <button
            onClick={() => onReply(comment.id)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
        )}
      </div>

      {/* Reply form */}
      {replyingTo === comment.id && (
        <div className="mt-2 ml-6 space-y-2 bg-secondary/30 p-3 rounded-lg">
          <Input
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder="Write your reply..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="text-sm min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onSubmitReply(comment.id)}
              disabled={isSubmitting}
            >
              <Send className="h-3 w-3 mr-1" />
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelReply}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              replyingTo={replyingTo}
              authorName={authorName}
              setAuthorName={setAuthorName}
              content={content}
              setContent={setContent}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
              isSubmitting={isSubmitting}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
};
