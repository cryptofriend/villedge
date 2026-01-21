import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Fingerprint, Mail, User, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const displayNameSchema = z.string().min(2, 'Display name must be at least 2 characters').optional();

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; displayName?: string }>({});
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

  const validateForm = (isSignUp: boolean) => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    if (isSignUp && displayName) {
      const displayNameResult = displayNameSchema.safeParse(displayName);
      if (!displayNameResult.success) {
        newErrors.displayName = displayNameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasskeySignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supportsPasskey) {
      toast.error('Your browser does not support passkeys');
      return;
    }
    
    if (!validateForm(false)) return;
    
    setIsSubmitting(true);
    
    try {
      // Get authentication options from our edge function
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'options', email }
      });

      if (optionsError || optionsData?.error) {
        throw new Error(optionsData?.error || optionsError?.message || 'Failed to get authentication options');
      }

      // Start the WebAuthn authentication
      const authResponse = await startAuthentication(optionsData.options);

      // Verify with our edge function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'verify', email, credential: authResponse }
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
    
    if (!validateForm(true)) return;
    
    setIsSubmitting(true);
    
    try {
      // Get registration options from our edge function
      const { data: optionsData, error: optionsError } = await supabase.functions.invoke('webauthn-register', {
        body: { step: 'options', email, displayName: displayName || email }
      });

      if (optionsError || optionsData?.error) {
        throw new Error(optionsData?.error || optionsError?.message || 'Failed to get registration options');
      }

      // Start the WebAuthn registration
      const regResponse = await startRegistration(optionsData.options);

      // Verify with our edge function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('webauthn-register', {
        body: { step: 'verify', email, displayName: displayName || email, credential: regResponse }
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

  if (!supportsPasskey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <Fingerprint className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-display">Passkeys Not Supported</CardTitle>
            <CardDescription>
              Your browser doesn't support passkeys (WebAuthn). Please use a modern browser like Chrome, Safari, or Firefox to sign in with biometrics.
            </CardDescription>
          </CardHeader>
        </Card>
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
          <CardTitle className="text-2xl font-display">Welcome to OurMap</CardTitle>
          <CardDescription>Sign in with your passkey or create an account using biometrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handlePasskeySignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
                  <Label htmlFor="signup-name">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
        </CardContent>
      </Card>
    </div>
  );
}
