import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { lovable } from '@/integrations/lovable';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Get the redirect path from location state (set by protected routes)
  const from = (location.state as { from?: string })?.from || '/';
  
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error(error.message || 'Google login failed');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Google login error:', err);
      toast.error('Google login failed');
      setIsLoading(false);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background/15 backdrop-blur-sm">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-sage-100/30 to-primary/10 relative overflow-hidden backdrop-blur-sm">
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-sage-200/30 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <span className="font-display text-2xl font-semibold text-foreground">Villedge</span>
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-bold text-foreground leading-tight mb-4">
              Join the global<br />
              <span className="text-primary">popup village</span><br />
              network
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Connect with like-minded builders, creators, and explorers at popup villages around the world.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex flex-col">
        {/* Back Button */}
        <div className="p-4 sm:p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Button>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Welcome to Villedge</h1>
              <p className="text-muted-foreground mt-1">Join the popup village network</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block text-center">
              <h2 className="font-display text-3xl font-bold text-foreground">Get Started</h2>
            </div>

            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-14 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
