import { useState } from "react";
import { Twitter, Github, Linkedin, Instagram, Globe, Plus, X, Save, Loader2, Send, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfileSocialLinks, getSocialPlatform } from "@/hooks/useProfileSocialLinks";
import { toast } from "sonner";

interface ProfileSocialLinksProps {
  userId: string | null;
  isOwnProfile: boolean;
}

const getPlatformIcon = (platform: string | null) => {
  switch (platform) {
    case "twitter":
      return { Icon: Twitter, color: "text-sky-500" };
    case "github":
      return { Icon: Github, color: "text-foreground" };
    case "linkedin":
      return { Icon: Linkedin, color: "text-blue-600" };
    case "instagram":
      return { Icon: Instagram, color: "text-pink-500" };
    case "telegram":
      return { Icon: Send, color: "text-sky-400" };
    case "spotify":
      return { Icon: Music, color: "text-green-500" };
    default:
      return { Icon: Globe, color: "text-muted-foreground" };
  }
};

export const ProfileSocialLinks = ({ userId, isOwnProfile }: ProfileSocialLinksProps) => {
  const { socialLinks, isLoading, addLink, deleteLink } = useProfileSocialLinks(userId);
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddLink = async () => {
    if (!newUrl.trim()) return;

    let url = newUrl.trim();
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSaving(true);
    const { error } = await addLink(url);
    setIsSaving(false);

    if (error) {
      toast.error("Failed to add link");
    } else {
      setNewUrl("");
      setIsAdding(false);
      toast.success("Social link added!");
    }
  };

  const handleDeleteLink = async (id: string) => {
    const { error } = await deleteLink(id);
    if (error) {
      toast.error("Failed to remove link");
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {socialLinks.map((link) => {
        const { Icon, color } = getPlatformIcon(link.platform);
        return (
          <div key={link.id} className="group relative">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-colors ${color}`}
              title={link.url}
            >
              <Icon className="h-4 w-4" />
            </a>
            {isOwnProfile && (
              <button
                onClick={() => handleDeleteLink(link.id)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove link"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        );
      })}

      {isOwnProfile && (
        isAdding ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="paste link..."
              className="h-8 w-40 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddLink();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewUrl("");
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleAddLink}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 text-primary" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                setIsAdding(false);
                setNewUrl("");
              }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
            title="Add social link"
          >
            <Plus className="h-4 w-4" />
          </button>
        )
      )}
    </div>
  );
};
