import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Comment {
  id: string;
  spot_id: string;
  author_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
}

export interface CommentsBySpot {
  [spotId: string]: Comment[];
}

export interface SpotCommentData {
  count: number;
  latestWhisper: string | null;
  latestComment: Comment | null;
  isRecent: boolean; // Has comment from last 24h
}

// Truncate to 2-5 words for whisper display
const truncateToWhisper = (text: string): string => {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const maxWords = Math.min(5, words.length);
  const whisper = words.slice(0, maxWords).join(' ');
  return words.length > maxWords ? whisper + '…' : whisper;
};

// Check if date is within last 24 hours
const isWithin24Hours = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff < 24 * 60 * 60 * 1000;
};

export const useComments = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsBySpot, setCommentsBySpot] = useState<CommentsBySpot>({});
  const [spotCommentData, setSpotCommentData] = useState<Map<string, SpotCommentData>>(new Map());
  const [loading, setLoading] = useState(true);

  const processComments = useCallback((commentsData: Comment[]) => {
    // Group by spot
    const bySpot: CommentsBySpot = {};
    commentsData.forEach(comment => {
      if (!bySpot[comment.spot_id]) {
        bySpot[comment.spot_id] = [];
      }
      bySpot[comment.spot_id].push(comment);
    });

    // Sort each spot's comments by date (newest first)
    Object.keys(bySpot).forEach(spotId => {
      bySpot[spotId].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // Create spot comment data map
    const dataMap = new Map<string, SpotCommentData>();
    Object.entries(bySpot).forEach(([spotId, spotComments]) => {
      const latest = spotComments[0];
      dataMap.set(spotId, {
        count: spotComments.length,
        latestWhisper: latest ? truncateToWhisper(latest.content) : null,
        latestComment: latest || null,
        isRecent: latest ? isWithin24Hours(latest.created_at) : false,
      });
    });

    setCommentsBySpot(bySpot);
    setSpotCommentData(dataMap);
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const commentsData = (data || []) as Comment[];
      setComments(commentsData);
      processComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [processComments]);

  const addComment = useCallback(async (spotId: string, authorName: string, content: string, parentId?: string) => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          spot_id: spotId,
          author_name: authorName,
          content,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newComment = data as Comment;
      const updatedComments = [newComment, ...comments];
      setComments(updatedComments);
      processComments(updatedComments);
      
      return newComment;
    } catch (error) {
      console.error("Error adding comment:", error);
      return null;
    }
  }, [comments, processComments]);

  // Set up realtime subscription
  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel('comments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          // Refetch on any change
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComments]);

  return {
    comments,
    commentsBySpot,
    spotCommentData,
    loading,
    addComment,
    refetch: fetchComments,
  };
};
