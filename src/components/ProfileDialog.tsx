import { useState, useEffect } from "react";
import { User, Link, Gift, HelpCircle, MessageSquare, ExternalLink, Briefcase } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getBestAvatar } from "@/lib/avatar";
import { PersonalTopUpDialog } from "./PersonalTopUpDialog";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const { profile, updateProfile, user } = useAuth();
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [displayName, setDisplayName] = useState("");
  const [socialProfile, setSocialProfile] = useState("");
  const [bio, setBio] = useState("");
  const [offerings, setOfferings] = useState("");
  const [asks, setAsks] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");

  // Load profile data when dialog opens
  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [open, profile]);

  // Generate preview avatar based on social profile or display name
  const previewAvatar = socialProfile 
    ? getBestAvatar(displayName || address || "user", socialProfile)
    : profile?.avatar_url || getBestAvatar(displayName || address || "user", null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate avatar from social profile if provided
      const avatarUrl = getBestAvatar(displayName.trim(), socialProfile || null);
      
      const { error } = await updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      });

      if (error) {
        toast.error("Failed to update profile");
        console.error("Profile update error:", error);
      } else {
        toast.success("Profile updated!");
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const truncatedAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Your Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Preview */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={previewAvatar} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {displayName.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {displayName || "Your Name"}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-mono">
                  {truncatedAddress}
                </p>
                {address && <PersonalTopUpDialog walletAddress={address} />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Add a social profile to use your real avatar
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
              placeholder="Your name or nickname"
              maxLength={30}
              required
            />
            <p className="text-xs text-muted-foreground">{displayName.length}/30 characters</p>
          </div>

          {/* Social Profile */}
          <div className="space-y-2">
            <Label htmlFor="social" className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              Social Profile URL
            </Label>
            <Input
              id="social"
              type="url"
              value={socialProfile}
              onChange={(e) => setSocialProfile(e.target.value)}
              placeholder="https://twitter.com/username"
            />
            <p className="text-xs text-muted-foreground">
              Twitter or GitHub URL to fetch your avatar
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              About You
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={2}
            />
          </div>

          {/* Offerings & Asks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="offerings" className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-muted-foreground" />
                Offerings
              </Label>
              <Textarea
                id="offerings"
                value={offerings}
                onChange={(e) => setOfferings(e.target.value)}
                placeholder="What can you offer?"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="asks" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Asks
              </Label>
              <Textarea
                id="asks"
                value={asks}
                onChange={(e) => setAsks(e.target.value)}
                placeholder="What help do you need?"
                rows={2}
              />
            </div>
          </div>

          {/* What do you work on? */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-primary" />
              What do you work on?
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              This info can be shared when you join a village
            </p>
            <Textarea
              id="projectDescription"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Brief description of your project or work..."
              rows={2}
            />
            <div className="mt-2">
              <Label htmlFor="projectUrl" className="flex items-center gap-2 text-xs">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                Link to your app/project
              </Label>
              <Input
                id="projectUrl"
                type="url"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://your-project.com"
                className="mt-1"
              />
            </div>
          </div>

          <Button type="submit" variant="sage" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
