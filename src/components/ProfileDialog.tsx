import { useState, useEffect } from "react";
import { User, Link, Gift, HelpCircle, MessageSquare, ExternalLink, Briefcase, Wallet, Twitter, Github, Linkedin, Instagram, Globe, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { getBestAvatar } from "@/lib/avatar";
import { PersonalTopUpDialog } from "./PersonalTopUpDialog";
import { usePersonalBalance } from "@/hooks/usePersonalBalance";

// Detect social platform from URL
const getSocialPlatform = (url: string) => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
    return { platform: "twitter", icon: Twitter, color: "text-sky-500", label: "Twitter/X" };
  }
  if (lowerUrl.includes("github.com")) {
    return { platform: "github", icon: Github, color: "text-foreground", label: "GitHub" };
  }
  if (lowerUrl.includes("linkedin.com")) {
    return { platform: "linkedin", icon: Linkedin, color: "text-blue-600", label: "LinkedIn" };
  }
  if (lowerUrl.includes("instagram.com")) {
    return { platform: "instagram", icon: Instagram, color: "text-pink-500", label: "Instagram" };
  }
  // Default to globe icon for other URLs
  if (url.startsWith("http")) {
    return { platform: "website", icon: Globe, color: "text-muted-foreground", label: "Website" };
  }
  return null;
};

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const { profile, updateProfile, user } = useAuth();
  const { address } = useAccount();
  const { balance, isLoading: isLoadingBalance } = usePersonalBalance(address);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [displayName, setDisplayName] = useState("");
  const [socialProfile, setSocialProfile] = useState("");
  const [bio, setBio] = useState("");
  const [offerings, setOfferings] = useState("");
  const [asks, setAsks] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");

  // Track which sections are expanded
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [projectExpanded, setProjectExpanded] = useState(false);

  // Load profile data when dialog opens or profile changes
  useEffect(() => {
    if (open) {
      // Always sync form with latest profile data when dialog opens
      setDisplayName(profile?.display_name || "");
      setSocialProfile(profile?.social_url || "");
      setBio(profile?.bio || "");
      setOfferings(profile?.offerings || "");
      setAsks(profile?.asks || "");
      setProjectDescription(profile?.project_description || "");
      setProjectUrl(profile?.project_url || "");
      
      // Auto-expand sections that have content
      setAboutExpanded(!!(profile?.bio || profile?.offerings || profile?.asks));
      setProjectExpanded(!!(profile?.project_description || profile?.project_url));
    }
  }, [open, profile]);

  // Get social platform info
  const socialPlatformInfo = getSocialPlatform(socialProfile);

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
        social_url: socialProfile.trim() || null,
        bio: bio.trim() || null,
        offerings: offerings.trim() || null,
        asks: asks.trim() || null,
        project_description: projectDescription.trim() || null,
        project_url: projectUrl.trim() || null,
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {displayName || "Your Name"}
                </p>
                {/* Social Icon */}
                {socialPlatformInfo && socialProfile && (
                  <a
                    href={socialProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hover:opacity-80 transition-opacity ${socialPlatformInfo.color}`}
                    title={socialPlatformInfo.label}
                  >
                    <socialPlatformInfo.icon className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-mono">
                  {truncatedAddress}
                </p>
                {address && <PersonalTopUpDialog walletAddress={address} />}
              </div>
              {/* Wallet Balance */}
              <div className="flex items-center gap-1.5 mt-1">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                {isLoadingBalance ? (
                  <span className="text-xs text-muted-foreground">Loading...</span>
                ) : (
                  <a
                    href={`https://basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-600/10 text-blue-600 text-[10px] font-medium">
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                  Base
                </span>
              </div>
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
              {socialPlatformInfo ? (
                <socialPlatformInfo.icon className={`h-4 w-4 ${socialPlatformInfo.color}`} />
              ) : (
                <Link className="h-4 w-4 text-muted-foreground" />
              )}
              Social Profile URL
            </Label>
            <div className="relative">
              <Input
                id="social"
                type="url"
                value={socialProfile}
                onChange={(e) => setSocialProfile(e.target.value)}
                placeholder="https://twitter.com/username"
                className={socialPlatformInfo ? "pr-10" : ""}
              />
              {socialPlatformInfo && socialProfile && (
                <a
                  href={socialProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity ${socialPlatformInfo.color}`}
                  title={`Open ${socialPlatformInfo.label}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Twitter, GitHub, LinkedIn, or Instagram URL
            </p>
          </div>

          {/* About You - Collapsible */}
          <Collapsible open={aboutExpanded} onOpenChange={setAboutExpanded}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  About You
                  {(bio || offerings || asks) && (
                    <span className="text-xs text-muted-foreground font-normal">
                      ({[bio, offerings, asks].filter(Boolean).length} filled)
                    </span>
                  )}
                </span>
                {aboutExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-xs text-muted-foreground">
                  Bio
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
                  <Label htmlFor="offerings" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Gift className="h-3 w-3" />
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
                  <Label htmlFor="asks" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <HelpCircle className="h-3 w-3" />
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
            </CollapsibleContent>
          </Collapsible>

          {/* What do you work on? - Collapsible */}
          <Collapsible open={projectExpanded} onOpenChange={setProjectExpanded}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-4 w-4 text-primary" />
                  What do you work on?
                  {(projectDescription || projectUrl) && (
                    <span className="text-xs text-muted-foreground font-normal">
                      (filled)
                    </span>
                  )}
                </span>
                {projectExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                This info can be shared when you join a village
              </p>
              <Textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Brief description of your project or work..."
                rows={2}
              />
              <div>
                <Label htmlFor="projectUrl" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
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
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" variant="sage" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
