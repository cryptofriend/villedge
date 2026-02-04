import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StayInput } from "@/hooks/useStays";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationQuestions, ApplicationQuestion } from "@/hooks/useApplicationQuestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddStayFormProps {
  villageId: string;
  onAddStay: (stay: StayInput) => Promise<any>;
}

export const AddStayForm = ({ villageId, onAddStay }: AddStayFormProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();
  
  const { questions, loading: questionsLoading } = useApplicationQuestions(villageId);
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Reset answers when questions change
  useEffect(() => {
    const initialAnswers: Record<string, string | string[]> = {};
    questions.forEach((q) => {
      initialAnswers[q.id] = q.question_type === "checkbox" ? [] : "";
    });
    setAnswers(initialAnswers);
  }, [questions]);

  const resetForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    const initialAnswers: Record<string, string | string[]> = {};
    questions.forEach((q) => {
      initialAnswers[q.id] = q.question_type === "checkbox" ? [] : "";
    });
    setAnswers(initialAnswers);
  };

  const validateRequiredQuestions = (): boolean => {
    for (const question of questions) {
      if (question.is_required) {
        const answer = answers[question.id];
        if (question.question_type === "checkbox") {
          if (!answer || (Array.isArray(answer) && answer.length === 0)) {
            toast.error(`Please answer: ${question.question_text}`);
            return false;
          }
        } else {
          if (!answer || (typeof answer === "string" && !answer.trim())) {
            toast.error(`Please answer: ${question.question_text}`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      toast.error("Please select arrival and departure dates");
      return;
    }

    if (endDate < startDate) {
      toast.error("Departure date must be after arrival date");
      return;
    }

    if (!user) {
      toast.error("You must be signed in to apply");
      return;
    }

    if (!validateRequiredQuestions()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Use profile data for the stay
      const nickname = profile?.username || user.email?.split('@')[0] || "Anonymous";
      
      const stay: StayInput = {
        village_id: villageId,
        nickname: nickname.slice(0, 30),
        villa: "Default",
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        intention: profile?.bio || undefined,
        social_profile: profile?.social_url || undefined,
        offerings: profile?.offerings || undefined,
        asks: profile?.asks || undefined,
        project_description: profile?.project_description || undefined,
        project_url: profile?.project_url || undefined,
        status: "planning", // Always planning - only host can confirm
        user_id: user.id,
      };

      const result = await onAddStay(stay);
      if (result) {
        // Save application answers
        const answersToInsert = Object.entries(answers)
          .filter(([_, value]) => {
            if (Array.isArray(value)) return value.length > 0;
            return value && value.trim();
          })
          .map(([questionId, answer]) => ({
            stay_id: result.id,
            question_id: questionId,
            answer: Array.isArray(answer) ? answer.join(", ") : answer,
          }));

        if (answersToInsert.length > 0) {
          const { error: answersError } = await supabase
            .from("stay_application_answers")
            .insert(answersToInsert);

          if (answersError) {
            console.error("Error saving answers:", answersError);
          }
        }

        resetForm();
        setOpen(false);
        toast.success("Application submitted! The host will review your request.");
        window.location.reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckboxOption = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      const currentArray = Array.isArray(current) ? current : [];
      if (currentArray.includes(option)) {
        return { ...prev, [questionId]: currentArray.filter((o) => o !== option) };
      } else {
        return { ...prev, [questionId]: [...currentArray, option] };
      }
    });
  };

  const renderQuestion = (question: ApplicationQuestion) => {
    const answer = answers[question.id];
    
    switch (question.question_type) {
      case "textarea":
        return (
          <Textarea
            placeholder="Your answer..."
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            className="min-h-[80px]"
          />
        );
      
      case "select":
        return (
          <Select
            value={typeof answer === "string" ? answer : ""}
            onValueChange={(value) => updateAnswer(question.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "checkbox":
        return (
          <div className="space-y-2">
            {question.options?.map((option) => {
              const checked = Array.isArray(answer) && answer.includes(option);
              return (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`${question.id}-${option}`}
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxOption(question.id, option)}
                  />
                  <Label
                    htmlFor={`${question.id}-${option}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        );
      
      default: // text
        return (
          <Input
            placeholder="Your answer..."
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="sage" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Apply to Join
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Apply to Join</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <form onSubmit={handleSubmit} className="space-y-5 pb-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Arrival <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Departure <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Custom Questions */}
            {questionsLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading questions...
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-4 pt-2">
                {questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <Label className="text-sm">
                      {question.question_text}
                      {question.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground text-center pt-2">
              Your application will be reviewed by the host
            </p>

            <Button 
              type="submit" 
              variant="sage" 
              className="w-full" 
              disabled={isSubmitting || !startDate || !endDate}
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
