import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Comment {
  id: string;
  spot_id: string;
  parent_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  replies?: Comment[];
}

export interface CommentInput {
  spot_id: string;
  parent_id?: string | null;
  author_name: string;
  content: string;
}

export const useComments = (spotId?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async (id: string) => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from("comments")
      .select("*")
      .eq("spot_id", id)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    // Organize comments with replies
    const commentsMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    (data || []).forEach((comment) => {
      commentsMap.set(comment.id, { ...comment, replies: [] });
    });

    commentsMap.forEach((comment) => {
      if (comment.parent_id && commentsMap.has(comment.parent_id)) {
        commentsMap.get(comment.parent_id)!.replies!.push(comment);
      } else if (!comment.parent_id) {
        rootComments.push(comment);
      }
    });

    setComments(rootComments);
    setLoading(false);
  };

  const addComment = async (input: CommentInput): Promise<boolean> => {
    const { error: insertError } = await supabase
      .from("comments")
      .insert({
        spot_id: input.spot_id,
        parent_id: input.parent_id || null,
        author_name: input.author_name,
        content: input.content,
      });

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    if (spotId) {
      await fetchComments(spotId);
    }
    return true;
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    if (spotId) {
      await fetchComments(spotId);
    }
    return true;
  };

  useEffect(() => {
    if (spotId) {
      fetchComments(spotId);
    }
  }, [spotId]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refetch: spotId ? () => fetchComments(spotId) : undefined,
  };
};

// Hook to get comment counts for multiple spots
export const useCommentCounts = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("comments")
      .select("spot_id");

    if (error) {
      setLoading(false);
      return;
    }

    const countMap: Record<string, number> = {};
    (data || []).forEach((comment) => {
      countMap[comment.spot_id] = (countMap[comment.spot_id] || 0) + 1;
    });

    setCounts(countMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return { counts, loading, refetch: fetchCounts };
};
