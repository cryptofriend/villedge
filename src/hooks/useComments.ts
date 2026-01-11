import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Comment {
  id: string;
  spot_id: string;
  parent_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface CommentInput {
  spot_id: string;
  author_name: string;
  content: string;
  parent_id?: string;
}

export const useComments = (spotId?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!spotId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("spot_id", spotId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [spotId]);

  const addComment = async (input: CommentInput): Promise<Comment | null> => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          spot_id: input.spot_id,
          author_name: input.author_name,
          content: input.content,
          parent_id: input.parent_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newComment = data as Comment;
      setComments((prev) => [newComment, ...prev]);
      return newComment;
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error("Failed to add note");
      return null;
    }
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      return true;
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error("Failed to delete note");
      return false;
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, error, addComment, deleteComment, refetch: fetchComments };
};

// Hook to get comment counts for all spots
export const useCommentCounts = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select("spot_id");

      if (error) throw error;

      const countMap: Record<string, number> = {};
      (data || []).forEach((comment) => {
        countMap[comment.spot_id] = (countMap[comment.spot_id] || 0) + 1;
      });
      setCounts(countMap);
    } catch (err) {
      console.error("Error fetching comment counts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading, refetch: fetchCounts };
};
