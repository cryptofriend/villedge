import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInvitationCodes, useReferrals, useCreateInvitationCode, useReferrerInfo } from '@/hooks/useReferrals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Plus, Users, Ticket, Check, Lock, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useUserProfilePopup } from '@/components/profile/UserProfilePopup';

// Special user IDs that can create custom codes
const CUSTOM_CODE_USERS = [
  'b015441b-3bb4-4150-94e6-d8be048035bb', // Booga
];

interface ProfileReferralSectionProps {
  isOwnProfile: boolean;
}

export function ProfileReferralSection({ isOwnProfile }: ProfileReferralSectionProps) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [customCodeDialogOpen, setCustomCodeDialogOpen] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customMaxUses, setCustomMaxUses] = useState('10');
  
  const { data: codes, isLoading: codesLoading } = useInvitationCodes();
  const { data: referrals, isLoading: referralsLoading } = useReferrals();
  const { data: referrerInfo } = useReferrerInfo();
  const createCode = useCreateInvitationCode();

  const isVerified = profile?.is_verified ?? false;
  const canCreateCustomCodes = user?.id && CUSTOM_CODE_USERS.includes(user.id);

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateCustomCode = () => {
    if (!customCode.trim()) {
      toast.error('Please enter a code');
      return;
    }
    const maxUses = parseInt(customMaxUses) || 10;
    createCode.mutate({ customCode: customCode.trim(), maxUses }, {
      onSuccess: () => {
        setCustomCodeDialogOpen(false);
        setCustomCode('');
        setCustomMaxUses('10');
      }
    });
  };

  if (!isOwnProfile) return null;

  return (
    <div className="space-y-4">
      {/* Referrer Info */}
      {referrerInfo && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={referrerInfo.avatar_url || ''} />
                <AvatarFallback>{referrerInfo.username?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Invited by</p>
                <button 
                  onClick={() => navigate(`/profile/${referrerInfo.username}`)}
                  className="font-medium text-primary hover:underline"
                >
                  @{referrerInfo.username || 'unknown'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Status */}
      {!isVerified && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">Limited Access</p>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Your account is not verified. Get an invitation code from a verified member to unlock full access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invitation Codes - Compact */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Ticket className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">Invite Codes</span>
            </div>
            
            {!isVerified ? (
              <span className="text-xs text-muted-foreground">Verification required</span>
            ) : codesLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                {codes && codes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {codes.slice(0, 2).map((code) => (
                      <Button
                        key={code.id}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 font-mono text-xs"
                        onClick={() => handleCopyCode(code.code)}
                        disabled={code.used_count >= code.max_uses}
                      >
                        {copiedCode === code.code ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <>
                            {code.code}
                            <span className="text-muted-foreground ml-1">
                              ({code.used_count}/{code.max_uses})
                            </span>
                          </>
                        )}
                      </Button>
                    ))}
                    {codes.length > 2 && (
                      <span className="text-xs text-muted-foreground">+{codes.length - 2}</span>
                    )}
                  </div>
                )}
                
                {/* Custom code button for special users */}
                {canCreateCustomCodes ? (
                  <Dialog open={customCodeDialogOpen} onOpenChange={setCustomCodeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Custom
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Custom Invite Code</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="customCode">Code</Label>
                          <Input
                            id="customCode"
                            placeholder="e.g. VILLEDGE2026"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                            className="font-mono"
                            maxLength={16}
                          />
                          <p className="text-xs text-muted-foreground">3-16 alphanumeric characters</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxUses">Max Uses</Label>
                          <Input
                            id="maxUses"
                            type="number"
                            min={1}
                            max={1000}
                            value={customMaxUses}
                            onChange={(e) => setCustomMaxUses(e.target.value)}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleCreateCustomCode}
                          disabled={createCode.isPending}
                        >
                          {createCode.isPending ? 'Creating...' : 'Create Code'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => createCode.mutate({})}
                    disabled={createCode.isPending}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referral Network - Only show if has referrals */}
      {referrals && referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Network
              <Badge variant="secondary">{referrals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {referrals.map((referral) => (
                <button
                  key={referral.id}
                  onClick={() => {
                    if (referral.referred_profile?.username) {
                      navigate(`/profile/${referral.referred_profile.username}`);
                    }
                  }}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={referral.referred_profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {referral.referred_profile?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    @{referral.referred_profile?.username || 'user'}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
