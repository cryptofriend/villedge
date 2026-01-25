import { useState } from "react";
import { Swords, Plus, Circle, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Quest } from "@/pages/Profile";

interface ProfileQuestsProps {
  quests: Quest[];
  isOwnProfile: boolean;
  onUpdate: (quests: Quest[]) => void;
}

const statusIcons = {
  open: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
};

const statusColors = {
  open: "text-muted-foreground",
  in_progress: "text-amber-500",
  completed: "text-emerald-500",
};

const tagColors: Record<string, string> = {
  "UX": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Infra": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Community": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Design": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "Dev": "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

export const ProfileQuests = ({ quests, isOwnProfile, onUpdate }: ProfileQuestsProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;

    const newQuest: Quest = {
      id: `quest-${Date.now()}`,
      title: newTitle.trim(),
      status: "open",
      tag: newTag || undefined,
    };

    onUpdate([newQuest, ...quests]);
    setNewTitle("");
    setNewTag("");
    setIsAdding(false);
  };

  const handleStatusChange = (questId: string, newStatus: Quest["status"]) => {
    onUpdate(
      quests.map((q) =>
        q.id === questId ? { ...q, status: newStatus } : q
      )
    );
  };

  const handleRemove = (questId: string) => {
    onUpdate(quests.filter((q) => q.id !== questId));
  };

  const activeQuests = quests.filter((q) => q.status !== "completed");
  const completedQuests = quests.filter((q) => q.status === "completed");

  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Active Focus</h2>
          <Badge variant="secondary" className="text-xs">
            {activeQuests.length} active
          </Badge>
        </div>
        {isOwnProfile && !isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Quest
          </Button>
        )}
      </div>

      {/* Add Quest Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What are you working on?"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Select value={newTag} onValueChange={setNewTag}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(tagColors).map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Active Quests */}
      <div className="space-y-2">
        {activeQuests.map((quest) => {
          const StatusIcon = statusIcons[quest.status];
          return (
            <div
              key={quest.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group"
            >
              {isOwnProfile ? (
                <Select
                  value={quest.status}
                  onValueChange={(value) => handleStatusChange(quest.id, value as Quest["status"])}
                >
                  <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none focus:ring-0">
                    <StatusIcon className={`h-4 w-4 ${statusColors[quest.status]} ${quest.status === "in_progress" ? "animate-spin" : ""}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusIcon className={`h-4 w-4 ${statusColors[quest.status]} ${quest.status === "in_progress" ? "animate-spin" : ""}`} />
              )}
              <span className="flex-1 text-sm text-foreground">{quest.title}</span>
              {quest.tag && (
                <Badge variant="outline" className={`text-xs ${tagColors[quest.tag] || ""}`}>
                  {quest.tag}
                </Badge>
              )}
              {isOwnProfile && (
                <button
                  onClick={() => handleRemove(quest.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed Quests (collapsed) */}
      {completedQuests.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            {completedQuests.length} completed
          </summary>
          <div className="mt-2 space-y-2">
            {completedQuests.map((quest) => (
              <div
                key={quest.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="flex-1 text-sm text-muted-foreground line-through">
                  {quest.title}
                </span>
                {quest.tag && (
                  <Badge variant="outline" className="text-xs opacity-50">
                    {quest.tag}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {quests.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-4">
          {isOwnProfile ? "Add your first quest to show what you're working on" : "No active quests"}
        </p>
      )}
    </section>
  );
};
