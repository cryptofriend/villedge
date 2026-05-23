import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { AuthDialog } from '@/components/AuthDialog';
import { SEO } from '@/components/SEO';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(true);

  const from = (location.state as { from?: string })?.from || '/';

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
    <div className="min-h-screen bg-background">
      <AuthDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) navigate('/');
        }}
        onSuccess={() => navigate(from, { replace: true })}
      />
    </div>
  );
}
