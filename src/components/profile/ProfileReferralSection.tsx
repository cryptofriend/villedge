import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInvitationCodes, useReferrals, useCreateInvitationCode, useReferrerInfo } from '@/hooks/useReferrals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Plus, Users, Ticket, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProfileReferralSectionProps {
  isOwnProfile: boolean;
}

export function ProfileReferralSection({ isOwnProfile }: ProfileReferralSectionProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const { data: codes, isLoading: codesLoading } = useInvitationCodes();
  const { data: referrals, isLoading: referralsLoading } = useReferrals();
  const { data: referrerInfo } = useReferrerInfo();
  const createCode = useCreateInvitationCode();

  const isVerified = profile?.is_verified ?? false;

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
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
                <AvatarFallback>{referrerInfo.display_name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Invited by</p>
                <button 
                  onClick={() => navigate(`/profile/${referrerInfo.username}`)}
                  className="font-medium text-primary hover:underline"
                >
                  @{referrerInfo.username || referrerInfo.display_name}
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

      {/* Invitation Codes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Invitation Codes
            </CardTitle>
            {isVerified && (
              <Button
                size="sm"
                onClick={() => createCode.mutate()}
                disabled={createCode.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Code
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isVerified ? (
            <p className="text-sm text-muted-foreground">
              You need to be verified to create invitation codes.
            </p>
          ) : codesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : codes && codes.length > 0 ? (
            <div className="space-y-2">
              {codes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold">{code.code}</code>
                    <Badge variant={code.used_count >= code.max_uses ? "secondary" : "outline"}>
                      {code.used_count}/{code.max_uses} used
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyCode(code.code)}
                    disabled={code.used_count >= code.max_uses}
                  >
                    {copiedCode === code.code ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No invitation codes yet. Create one to invite others!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Referral Network */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Network
            {referrals && referrals.length > 0 && (
              <Badge variant="secondary">{referrals.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralsLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          ) : referrals && referrals.length > 0 ? (
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
                      {referral.referred_profile?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    @{referral.referred_profile?.username || 'user'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isVerified 
                ? "No one has joined using your codes yet."
                : "Get verified to invite others to the network."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
