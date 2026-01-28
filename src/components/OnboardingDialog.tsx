import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, User, ArrowRight, Ticket, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialInvitationCode?: string;
}

export function OnboardingDialog({ open, onOpenChange, initialInvitationCode }: OnboardingDialogProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [username, setUsername] = useState('');
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode || '');
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Pre-fill with current username suggestion
  useEffect(() => {
    if (profile?.username && !username) {
      setUsername(profile.username);
    }
  }, [profile?.username]);

  // Validate invitation code when changed
  useEffect(() => {
    const validateCode = async () => {
      const code = invitationCode.trim().toUpperCase();
      if (!code) {
        setCodeStatus('idle');
        setCodeError(null);
        return;
      }

      if (code.length < 8) {
        setCodeStatus('idle');
        return;
      }

      setCodeStatus('checking');
      
      try {
        const { data, error } = await supabase.rpc('validate_invitation_code', { _code: code });
        
        if (error) throw error;
        
        // Cast the JSON response
        const result = data as { valid: boolean; error?: string; code_id?: string; owner_id?: string } | null;
        
        if (result?.valid) {
          setCodeStatus('valid');
          setCodeError(null);
        } else {
          setCodeStatus('invalid');
          setCodeError(result?.error || 'Invalid code');
        }
      } catch (err) {
        console.error('Error validating code:', err);
        setCodeStatus('invalid');
        setCodeError('Failed to validate code');
      }
    };

    const debounceTimer = setTimeout(validateCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [invitationCode]);

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

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Check if user already verified; if not and has valid code, apply it
        const isVerified = codeStatus === 'valid';
        
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            username: cleanUsername,
            ...(isVerified ? { is_verified: true } : {}),
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        
        // If valid code, use it to create referral
        if (isVerified && invitationCode.trim()) {
          const code = invitationCode.trim().toUpperCase();
          const { data: codeData } = await supabase.rpc('validate_invitation_code', { _code: code });
          const result = codeData as { valid: boolean; code_id?: string; owner_id?: string } | null;
          
          if (result?.valid && result?.code_id && result?.owner_id) {
            await supabase.rpc('use_invitation_code', {
              _code_id: result.code_id,
              _referrer_id: result.owner_id,
              _referred_id: user.id,
            });
          }
        }
      } else {
        // Create new profile
        const isVerified = codeStatus === 'valid';
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username: cleanUsername,
            display_name: cleanUsername,
            is_verified: isVerified,
          });

        if (insertError) throw insertError;
        
        // If valid code, use it
        if (isVerified && invitationCode.trim()) {
          const code = invitationCode.trim().toUpperCase();
          const { data: codeData } = await supabase.rpc('validate_invitation_code', { _code: code });
          const result = codeData as { valid: boolean; code_id?: string; owner_id?: string } | null;
          
          if (result?.valid && result?.code_id && result?.owner_id) {
            await supabase.rpc('use_invitation_code', {
              _code_id: result.code_id,
              _referrer_id: result.owner_id,
              _referred_id: user.id,
            });
          }
        }
      }

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
        <div className="p-6 space-y-5">
          {/* Username Field */}
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

          {/* Invitation Code Field */}
          <div className="space-y-2">
            <Label htmlFor="invitation-code" className="text-sm font-medium flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Invitation Code
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="invitation-code"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className={`h-11 font-mono tracking-wider uppercase ${
                  codeStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-500' : 
                  codeStatus === 'invalid' ? 'border-destructive' : ''
                }`}
                maxLength={10}
              />
              {codeStatus === 'checking' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {codeStatus === 'valid' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              )}
              {codeStatus === 'invalid' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-destructive" />
                </div>
              )}
            </div>
            {codeError && (
              <p className="text-sm text-destructive">{codeError}</p>
            )}
            {codeStatus === 'valid' && (
              <p className="text-sm text-green-600">Valid code! You'll get full access.</p>
            )}
            {codeStatus === 'idle' && (
              <p className="text-xs text-muted-foreground">
                Enter a code from an existing member to unlock full access.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
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
