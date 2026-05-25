import { MessageSquare } from "lucide-react";

export const ContactDevButton = () => {
  return (
    <a
      href="https://x.com/boogaav"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 backdrop-blur-sm transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95"
      aria-label="Contact dev on X"
    >
      <MessageSquare className="h-4 w-4" />
      <span className="hidden sm:inline">Contact dev</span>
    </a>
  );
};
