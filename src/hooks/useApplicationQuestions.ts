import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ApplicationQuestion {
  id: string;
  village_id: string;
  question_text: string;
  question_type: "text" | "textarea" | "select" | "checkbox";
  options: string[];
  is_required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationQuestionInput {
  question_text: string;
  question_type: "text" | "textarea" | "select" | "checkbox";
  options?: string[];
  is_required?: boolean;
  order_index?: number;
}

export const useApplicationQuestions = (villageId: string) => {
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    if (!villageId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("village_application_questions")
        .select("*")
        .eq("village_id", villageId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      setQuestions((data as ApplicationQuestion[]) || []);
    } catch (err) {
      console.error("Error fetching application questions:", err);
      toast.error("Failed to load application questions");
    } finally {
      setLoading(false);
    }
  }, [villageId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const addQuestion = async (input: ApplicationQuestionInput): Promise<ApplicationQuestion | null> => {
    try {
      const maxOrderIndex = questions.reduce((max, q) => Math.max(max, q.order_index), -1);
      
      const { data, error } = await supabase
        .from("village_application_questions")
        .insert({
          village_id: villageId,
          question_text: input.question_text,
          question_type: input.question_type,
          options: input.options || [],
          is_required: input.is_required ?? true,
          order_index: input.order_index ?? maxOrderIndex + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const newQuestion = data as ApplicationQuestion;
      setQuestions((prev) => [...prev, newQuestion].sort((a, b) => a.order_index - b.order_index));
      toast.success("Question added");
      return newQuestion;
    } catch (err) {
      console.error("Error adding question:", err);
      toast.error("Failed to add question");
      return null;
    }
  };

  const updateQuestion = async (id: string, updates: Partial<ApplicationQuestionInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("village_application_questions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setQuestions((prev) =>
        prev
          .map((q) => (q.id === id ? { ...q, ...updates } : q))
          .sort((a, b) => a.order_index - b.order_index)
      );
      toast.success("Question updated");
      return true;
    } catch (err) {
      console.error("Error updating question:", err);
      toast.error("Failed to update question");
      return false;
    }
  };

  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("village_application_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted");
      return true;
    } catch (err) {
      console.error("Error deleting question:", err);
      toast.error("Failed to delete question");
      return false;
    }
  };

  const reorderQuestions = async (questionIds: string[]): Promise<boolean> => {
    try {
      const updates = questionIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("village_application_questions")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
        
        if (error) throw error;
      }

      setQuestions((prev) =>
        prev
          .map((q) => {
            const newIndex = questionIds.indexOf(q.id);
            return newIndex >= 0 ? { ...q, order_index: newIndex } : q;
          })
          .sort((a, b) => a.order_index - b.order_index)
      );
      
      return true;
    } catch (err) {
      console.error("Error reordering questions:", err);
      toast.error("Failed to reorder questions");
      return false;
    }
  };

  return {
    questions,
    loading,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    refetch: fetchQuestions,
  };
};
