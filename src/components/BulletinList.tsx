import { useState } from "react";
import { useBulletin } from "@/hooks/useBulletin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

interface BulletinListProps {
  villageId: string;
}

export const BulletinList = ({ villageId }: BulletinListProps) => {
  const { messages, isLoading, addMessage } = useBulletin(villageId);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="flex flex-col h-full">
      {/* Message form */}
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

      {/* Messages list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8 flex flex-col items-center gap-2">
              <MessageCircle className="h-8 w-8 opacity-50" />
              <p>No messages yet. Be the first to post!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {msg.message}
                </p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
