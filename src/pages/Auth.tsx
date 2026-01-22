import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Fingerprint, User, Loader2, Globe } from 'lucide-react';
import { z } from 'zod';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';

const usernameSchema = z.string().min(2, 'Username must be at least 2 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens');

const WORLD_ID_APP_ID = import.meta.env.VITE_WORLD_ID_APP_ID || 'app_staging_placeholder';
const WORLD_ID_ACTION = 'login';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWorldIdVerifying, setIsWorldIdVerifying] = useState(false);
  const [showPasskeySignup, setShowPasskeySignup] = useState(false);
  const [errors, setErrors] = useState<{ username?: string }>({});
  const [supportsPasskey, setSupportsPasskey] = useState(false);

  useEffect(() => {
    setSupportsPasskey(browserSupportsWebAuthn());
  }, []);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const usernameResult = usernameSchema.safeParse(username);
    if (!usernameResult.success) {
      newErrors.username = usernameResult.error.errors[0].message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleWorldIdVerify = async (proof: ISuccessResult) => {
    const { data, error } = await supabase.functions.invoke('verify-world-id', {
      body: {
        proof: proof.proof,
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        verification_level: proof.verification_level,
        action: WORLD_ID_ACTION,
      }
    });

    if (error || data?.error) {
      throw new Error(data?.error || error?.message || 'World ID verification failed');
    }

    if (!data?.verified) {
      throw new Error('World ID verification failed');
    }

    return data;
  };

  const handleWorldIdSuccess = async (result: ISuccessResult) => {
    setIsWorldIdVerifying(true);
    
    try {
      const verifyData = await handleWorldIdVerify(result);
      
      if (verifyData.verified && verifyData.actionLink) {
        const url = new URL(verifyData.actionLink);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        
        if (token && type) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'magiclink'
          });
          
          if (sessionError) {
            throw sessionError;
          }
        }
        
        toast.success('Signed in with World ID!');
        navigate('/');
      }
    } catch (error) {
      console.error('World ID sign-in error:', error);
      toast.error(error instanceof Error ? error.message : 'World ID authentication failed');
    } finally {
      setIsWorldIdVerifying(false);
    }
  };

  const handlePasskeySignIn = async () => {
    if (!supportsPasskey || !validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'options', username }
      });

      if (optionsError || optionsData?.error) {
        throw new Error(optionsData?.error || optionsError?.message || 'Failed to get authentication options');
      }

      const authResponse = await startAuthentication(optionsData.options);

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'verify', username, credential: authResponse }
      });

      if (verifyError || verifyData?.error) {
        throw new Error(verifyData?.error || verifyError?.message || 'Authentication failed');
      }

      if (verifyData.verified && verifyData.actionLink) {
        const url = new URL(verifyData.actionLink);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        
        if (token && type) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'magiclink'
          });
          
          if (sessionError) throw sessionError;
        }
        
        toast.success('Signed in successfully!');
        navigate('/');
      }
    } catch (error) {
      console.error('Passkey sign-in error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeySignUp = async () => {
    if (!supportsPasskey || !validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke('webauthn-register', {
        body: { step: 'options', username }
      });

      if (optionsError || optionsData?.error) {
        throw new Error(optionsData?.error || optionsError?.message || 'Failed to get registration options');
      }

      const regResponse = await startRegistration(optionsData.options);

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('webauthn-register', {
        body: { step: 'verify', username, credential: regResponse }
      });

      if (verifyError || verifyData?.error) {
        throw new Error(verifyData?.error || verifyError?.message || 'Registration failed');
      }

      if (verifyData.verified && verifyData.actionLink) {
        const url = new URL(verifyData.actionLink);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        
        if (token && type) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'magiclink'
          });
          
          if (sessionError) throw sessionError;
        }
        
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (error) {
      console.error('Passkey sign-up error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Welcome to Villedge</CardTitle>
          <CardDescription>Sign in with World ID or passkey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auth Buttons Row */}
          <div className="flex gap-3">
            {/* World ID Sign In */}
            <IDKitWidget
              app_id={WORLD_ID_APP_ID as `app_${string}`}
              action={WORLD_ID_ACTION}
              onSuccess={handleWorldIdSuccess}
              handleVerify={handleWorldIdVerify}
              verification_level={VerificationLevel.Orb}
            >
              {({ open }) => (
                <Button 
                  onClick={open} 
                  className="flex-1 gap-2 h-12 bg-black hover:bg-black/90 text-white"
                  disabled={isWorldIdVerifying}
                >
                  {isWorldIdVerifying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Globe className="h-5 w-5" />
                      <span className="hidden sm:inline">World ID</span>
                    </>
                  )}
                </Button>
              )}
            </IDKitWidget>

            {/* Passkey Sign In */}
            {supportsPasskey && (
              <Button 
                onClick={() => setShowPasskeySignup(!showPasskeySignup)} 
                className="flex-1 gap-2 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isSubmitting}
              >
                <Fingerprint className="h-5 w-5" />
                <span className="hidden sm:inline">Passkey</span>
              </Button>
            )}
          </div>

          {/* Passkey Form */}
          {supportsPasskey && showPasskeySignup && (
            <div className="space-y-3 pt-3 border-t border-border/50">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handlePasskeySignIn} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Fingerprint className="h-3 w-3" />}
                  Sign In
                </Button>
                <Button 
                  onClick={handlePasskeySignUp} 
                  size="sm" 
                  className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Fingerprint className="h-3 w-3" />}
                  Sign Up
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
