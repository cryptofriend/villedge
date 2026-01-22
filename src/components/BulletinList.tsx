import { useState } from "react";
import { useBulletin } from "@/hooks/useBulletin";
import { useBulletinReactions, ReactionType } from "@/hooks/useBulletinReactions";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageCircle, Heart, HandMetal, Sparkles, TrendingUp, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface BulletinListProps {
  villageId: string;
}

const REACTIONS: { type: ReactionType; icon: typeof Heart; label: string; activeColor: string }[] = [
  { type: "support", icon: Heart, label: "Supporting", activeColor: "text-red-500" },
  { type: "in", icon: HandMetal, label: "I'm in!", activeColor: "text-yellow-500" },
  { type: "cute", icon: Sparkles, label: "So cute", activeColor: "text-pink-400" },
];

export const BulletinList = ({ villageId }: BulletinListProps) => {
  const { messages, isLoading, addMessage, refetch } = useBulletin(villageId);
  const { addReaction, getReactionCounts, getTopBulletinIds } = useBulletinReactions(villageId);
  const { canCreate, isHost } = usePermissions();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTopPosts, setShowTopPosts] = useState(false);

  const handleDelete = async (bulletinId: string) => {
    try {
      const { error } = await supabase
        .from('bulletin')
        .delete()
        .eq('id', bulletinId);
      
      if (error) throw error;
      
      toast({
        title: "Message deleted",
        description: "The message has been removed",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: "Missing message",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addMessage.mutateAsync({ message: message.trim() });
      setMessage("");
      toast({
        title: "Message posted!",
        description: "Your message has been added to the bulletin",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post message",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async (bulletinId: string, reactionType: ReactionType) => {
    try {
      await addReaction.mutateAsync({ bulletinId, reactionType });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    }
  };

  // Sort messages based on showTopPosts toggle
  const displayMessages = showTopPosts
    ? [...messages].sort((a, b) => {
        const topIds = getTopBulletinIds();
        const aIndex = topIds.indexOf(a.id);
        const bIndex = topIds.indexOf(b.id);
        // Messages with reactions come first, sorted by reaction count
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
    : messages;

  return (
    <div className="flex flex-col h-full">
      {/* Header with top posts toggle */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-xs text-muted-foreground font-medium">
          {showTopPosts ? "Top Posts" : "Latest Posts"}
        </span>
        <Button
          variant={showTopPosts ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowTopPosts(!showTopPosts)}
          className="h-7 gap-1 text-xs"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Top
        </Button>
      </div>

      {/* Message form - only for authenticated users */}
      {canCreate ? (
        <form onSubmit={handleSubmit} className="p-4 border-b border-border">
          <div className="flex gap-2">
            <Textarea
              placeholder="Share something with the village..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-sm min-h-[60px] resize-none flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isSubmitting || !message.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 border-b border-border text-center text-sm text-muted-foreground">
          Sign in to post messages
        </div>
      )}

      {/* Messages list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Loading messages...
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8 flex flex-col items-center gap-2">
              <MessageCircle className="h-8 w-8 opacity-50" />
              <p>No messages yet. Be the first to post!</p>
            </div>
          ) : (
            displayMessages.map((msg) => {
              const counts = getReactionCounts(msg.id);
              
              return (
                <div key={msg.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words flex-1">
                      {msg.message}
                    </p>
                    {isHost(villageId) && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="shrink-0 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Reactions row */}
                  <div className="flex items-center gap-1 mt-2">
                    {REACTIONS.map(({ type, icon: Icon, label, activeColor }) => {
                      const count = counts[type];
                      const hasReactions = count > 0;
                      
                      return (
                        <button
                          key={type}
                          onClick={() => canCreate && handleReaction(msg.id, type)}
                          disabled={!canCreate}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
                            "hover:bg-muted border border-transparent",
                            hasReactions 
                              ? "bg-muted/80 border-border/50" 
                              : "opacity-60 hover:opacity-100",
                            !canCreate && "cursor-not-allowed opacity-50"
                          )}
                          title={canCreate ? label : "Sign in to react"}
                        >
                          <Icon className={cn("h-3.5 w-3.5", hasReactions && activeColor)} />
                          {hasReactions && (
                            <span className="text-muted-foreground">{count}</span>
                          )}
                        </button>
                      );
                    })}
                    
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
