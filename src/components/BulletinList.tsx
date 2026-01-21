import { useState } from "react";
import { useBulletin } from "@/hooks/useBulletin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

interface BulletinListProps {
  villageId: string;
}

// Generate avatar color from name
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const BulletinList = ({ villageId }: BulletinListProps) => {
  const { messages, isLoading, addMessage } = useBulletin(villageId);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter your name and message",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addMessage.mutateAsync({ author_name: authorName.trim(), message: message.trim() });
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
      <form onSubmit={handleSubmit} className="p-4 border-b border-border space-y-3">
        <Input
          placeholder="Your name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="text-sm"
        />
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
            disabled={isSubmitting || !authorName.trim() || !message.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Messages list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
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
              <div key={msg.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={`${getAvatarColor(msg.author_name)} text-white text-xs font-medium`}>
                    {msg.author_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm text-foreground">{msg.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
