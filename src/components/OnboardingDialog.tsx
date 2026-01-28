import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Pre-fill with current username suggestion
  useEffect(() => {
    if (profile?.username && !username) {
      setUsername(profile.username);
    }
  }, [profile?.username]);

  const validateUsername = (value: string): string | null => {
    const trimmed = value.trim().toLowerCase();
    
    if (!trimmed) {
      return 'Username is required';
    }
    
    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters';
    }
    
    if (trimmed.length > 30) {
      return 'Username must be 30 characters or less';
    }
    
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      return 'Only lowercase letters, numbers, and hyphens allowed';
    }
    
    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      return 'Username cannot start or end with a hyphen';
    }
    
    return null;
  };

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(sanitized);
    setUsernameError(null);
  };

  const handleSubmit = async () => {
    if (!user) return;

    const error = validateUsername(username);
    if (error) {
      setUsernameError(error);
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    
    setIsSaving(true);
    try {
      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .neq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setUsernameError('This username is already taken');
        setIsSaving(false);
        return;
      }

      // Update profile with new username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: cleanUsername })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Welcome to Villedge! 🎉');
      onOpenChange(false);
      
      // Navigate to profile page
      navigate(`/profile/${cleanUsername}`);
    } catch (error) {
      console.error('Error saving username:', error);
      toast.error('Failed to save username');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    if (profile?.username) {
      navigate(`/profile/${profile.username}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[90vw] p-0 gap-0 overflow-hidden bg-background border-border">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 p-6 pb-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-display font-bold">
              Welcome to Villedge!
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Choose a unique username to complete your profile
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Your Username
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                @
              </span>
              <Input
                id="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="choose-a-username"
                className={`pl-8 h-12 text-lg ${usernameError ? 'border-destructive' : ''}`}
                maxLength={30}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
            </div>
            {usernameError && (
              <p className="text-sm text-destructive">{usernameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only. This will be your profile URL.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !username.trim()}
              className="w-full h-12 text-base font-medium rounded-xl"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <span>Continue</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
