import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, User, MapPin, MessageSquare, Link, Gift, HelpCircle, Lock, Briefcase, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StayInput, hashSecret } from "@/hooks/useStays";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VILLA_OPTIONS = [
  "Villa A",
  "Villa B", 
  "Villa C",
  "Villa D",
  "Main House",
  "Guest House",
  "Other",
];

interface AddStayFormProps {
  villageId: string;
  onAddStay: (stay: StayInput) => Promise<any>;
}

export const AddStayForm = ({ villageId, onAddStay }: AddStayFormProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [nickname, setNickname] = useState("");
  const [villa, setVilla] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [intention, setIntention] = useState("");
  const [socialProfile, setSocialProfile] = useState("");
  const [offerings, setOfferings] = useState("");
  const [asks, setAsks] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");

  const resetForm = () => {
    setNickname("");
    setVilla("");
    setStartDate(undefined);
    setEndDate(undefined);
    setIntention("");
    setSocialProfile("");
    setOfferings("");
    setAsks("");
    setSecretCode("");
    setProjectDescription("");
    setProjectUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim() || !villa || !startDate || !endDate) {
      return;
    }

    if (endDate < startDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const hashedSecret = await hashSecret(secretCode);
      
      const stay: StayInput = {
        village_id: villageId,
        nickname: nickname.trim().slice(0, 30),
        villa,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        intention: intention.trim() || undefined,
        social_profile: socialProfile.trim() || undefined,
        offerings: offerings.trim() || undefined,
        asks: asks.trim() || undefined,
        secret_hash: hashedSecret,
        project_description: projectDescription.trim() || undefined,
        project_url: projectUrl.trim() || undefined,
      };

      const result = await onAddStay(stay);
      if (result) {
        // If project info provided, create a Scenius entry
        if (projectDescription.trim()) {
          try {
            await supabase.from("scenius").insert({
              village_id: villageId,
              name: `${nickname.trim()}'s Project`,
              description: projectDescription.trim(),
              project_url: projectUrl.trim() || null,
              contributors: [nickname.trim()],
              status: "active",
              tags: [],
            });
          } catch (err) {
            console.error("Failed to create scenius entry:", err);
          }
        }
        resetForm();
        setOpen(false);
        toast.success("Welcome to the village!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="sage" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Your Stay
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Your Stay</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Nickname <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 30))}
              placeholder="Your name or nickname"
              maxLength={30}
              required
            />
            <p className="text-xs text-muted-foreground">{nickname.length}/30 characters</p>
          </div>

          {/* Villa */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Villa <span className="text-destructive">*</span>
            </Label>
            <Select value={villa} onValueChange={setVilla} required>
              <SelectTrigger>
                <SelectValue placeholder="Select your accommodation" />
              </SelectTrigger>
              <SelectContent>
                {VILLA_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
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
              <Label className="flex items-center gap-2">
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

          {/* Intention */}
          <div className="space-y-2">
            <Label htmlFor="intention" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              What brings you here?
            </Label>
            <Textarea
              id="intention"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Your goals, projects, or reasons for joining..."
              rows={2}
            />
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
              This will create a card in the Scenius tab
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

          {/* Secret Code */}
          <div className="space-y-2">
            <Label htmlFor="secret" className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Secret Code (for editing later)
            </Label>
            <Input
              id="secret"
              type="password"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="Create a secret code to edit your stay"
            />
            <p className="text-xs text-muted-foreground">
              Remember this code to edit or delete your stay later
            </p>
          </div>

          <Button type="submit" variant="sage" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Joining..." : "Join Village"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
