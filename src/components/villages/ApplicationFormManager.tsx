import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Loader2, X, Calendar, Info } from "lucide-react";
import { useApplicationQuestions, ApplicationQuestion, ApplicationQuestionInput } from "@/hooks/useApplicationQuestions";

interface ApplicationFormManagerProps {
  villageId: string;
}

const questionTypeLabels: Record<string, string> = {
  text: "Short Text",
  textarea: "Long Text",
  select: "Dropdown",
  checkbox: "Checkbox",
};

export const ApplicationFormManager = ({ villageId }: ApplicationFormManagerProps) => {
  const { questions, loading, addQuestion, updateQuestion, deleteQuestion } = useApplicationQuestions(villageId);
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState<ApplicationQuestionInput>({
    question_text: "",
    question_type: "text",
    options: [],
    is_required: true,
  });
  const [newOption, setNewOption] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddQuestion = async () => {
    if (!newQuestion.question_text.trim()) return;
    
    await addQuestion(newQuestion);
    setNewQuestion({
      question_text: "",
      question_type: "text",
      options: [],
      is_required: true,
    });
    setIsAdding(false);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setNewQuestion((prev) => ({
      ...prev,
      options: [...(prev.options || []), newOption.trim()],
    }));
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    setNewQuestion((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }));
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      await deleteQuestion(id);
    }
  };

  const handleToggleRequired = async (question: ApplicationQuestion) => {
    await updateQuestion(question.id, { is_required: !question.is_required });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Fields Info */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Default Application Fields</p>
              <p className="text-xs text-muted-foreground">
                These fields are always included in every application:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Stay Dates (Start & End)
                </Badge>
                <Badge variant="secondary">Nickname</Badge>
                <Badge variant="secondary">Villa Selection</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Custom Questions</h4>
          <p className="text-sm text-muted-foreground">
            Add additional questions for residents to answer when applying
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        )}
      </div>
      {/* Existing Questions */}
      {questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <Card key={question.id} className="group">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground pt-1">
                    <GripVertical className="h-4 w-4 opacity-50" />
                    <span className="text-sm font-medium w-5">{index + 1}.</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{question.question_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {questionTypeLabels[question.question_type]}
                          </Badge>
                          {question.is_required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.options.map((opt, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-muted">
                                {opt}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`required-${question.id}`} className="text-xs text-muted-foreground">
                            Required
                          </Label>
                          <Switch
                            id={`required-${question.id}`}
                            checked={question.is_required}
                            onCheckedChange={() => handleToggleRequired(question)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isAdding ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <p className="text-muted-foreground text-sm">No questions yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Add questions to collect more information from applicants
          </p>
        </div>
      ) : null}

      {/* Add Question Form */}
      {isAdding && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, question_text: e.target.value }))}
                placeholder="What would you like to ask applicants?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newQuestion.question_type}
                  onValueChange={(val) =>
                    setNewQuestion((prev) => ({
                      ...prev,
                      question_type: val as ApplicationQuestionInput["question_type"],
                      options: val === "select" ? prev.options : [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Short Text</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Required</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={newQuestion.is_required}
                    onCheckedChange={(checked) =>
                      setNewQuestion((prev) => ({ ...prev, is_required: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Options for dropdown type */}
            {newQuestion.question_type === "select" && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add an option..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddOption}>
                    Add
                  </Button>
                </div>
                {newQuestion.options && newQuestion.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newQuestion.options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {opt}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewQuestion({
                    question_text: "",
                    question_type: "text",
                    options: [],
                    is_required: true,
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddQuestion}
                disabled={!newQuestion.question_text.trim()}
              >
                Add Question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
