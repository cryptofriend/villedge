import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Fingerprint, User, Loader2, Globe } from 'lucide-react';
import { z } from 'zod';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';

const usernameSchema = z.string().min(2, 'Username must be at least 2 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens');

// World ID app_id - this is the public app identifier
const WORLD_ID_APP_ID = import.meta.env.VITE_WORLD_ID_APP_ID || 'app_staging_placeholder';
const WORLD_ID_ACTION = 'login';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWorldIdVerifying, setIsWorldIdVerifying] = useState(false);
  const [errors, setErrors] = useState<{ username?: string }>({});
  const [supportsPasskey, setSupportsPasskey] = useState(false);

  useEffect(() => {
    setSupportsPasskey(browserSupportsWebAuthn());
  }, []);

  // Redirect if already authenticated
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
    console.log('World ID proof received:', proof);
    
    // Send proof to our edge function for verification
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
      console.error('World ID verification failed:', error || data?.error);
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
        // Use the magic link to create a session
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

  const handlePasskeySignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supportsPasskey) {
      toast.error('Your browser does not support passkeys');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Get authentication options from our edge function
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'options', username }
      });

      if (optionsError || optionsData?.error) {
        throw new Error(optionsData?.error || optionsError?.message || 'Failed to get authentication options');
      }

      // Start the WebAuthn authentication
      const authResponse = await startAuthentication(optionsData.options);

      // Verify with our edge function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'verify', username, credential: authResponse }
      });

      if (verifyError || verifyData?.error) {
        throw new Error(verifyData?.error || verifyError?.message || 'Authentication failed');
      }

      if (verifyData.verified && verifyData.actionLink) {
        // Use the magic link to create a session
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

  const handlePasskeySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supportsPasskey) {
      toast.error('Your browser does not support passkeys');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Get registration options from our edge function
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke('webauthn-register', {
        body: { step: 'options', username }
      });

      if (optionsError || optionsData?.error) {
        throw new Error(optionsData?.error || optionsError?.message || 'Failed to get registration options');
      }

      // Start the WebAuthn registration
      const regResponse = await startRegistration(optionsData.options);

      // Verify with our edge function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('webauthn-register', {
        body: { step: 'verify', username, credential: regResponse }
      });

      if (verifyError || verifyData?.error) {
        throw new Error(verifyData?.error || verifyError?.message || 'Registration failed');
      }

      if (verifyData.verified && verifyData.actionLink) {
        // Use the magic link to create a session
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
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Welcome to Villedge</CardTitle>
          <CardDescription>Sign in with passkey or World ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* World ID Sign In */}
          <div className="space-y-3">
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
                  variant="outline" 
                  className="w-full gap-2 h-12 border-2"
                  disabled={isWorldIdVerifying}
                >
                  {isWorldIdVerifying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Globe className="h-5 w-5" />
                      Sign in with World ID
                    </>
                  )}
                </Button>
              )}
            </IDKitWidget>
            <p className="text-xs text-muted-foreground text-center">
              Prove you're human with World ID
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Passkey Sign In/Up */}
          {supportsPasskey ? (
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handlePasskeySignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-username"
                        type="text"
                        placeholder="your_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                  </div>
                  
                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-4 w-4" />
                        Sign In with Passkey
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Use Face ID, Touch ID, or Windows Hello to sign in
                  </p>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handlePasskeySignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Choose a Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="your_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                    <p className="text-xs text-muted-foreground">
                      Letters, numbers, underscores and hyphens only
                    </p>
                  </div>
                  
                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating passkey...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-4 w-4" />
                        Create Account with Passkey
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Set up Face ID, Touch ID, or Windows Hello for passwordless login
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Fingerprint className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Passkeys are not supported in this browser. Use World ID above to sign in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
