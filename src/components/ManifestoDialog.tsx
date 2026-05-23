import { ScrollText, PenLine, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useManifestoSignatures } from "@/hooks/useManifestoSignatures";
import { AuthDialog } from "@/components/AuthDialog";

export const ManifestoDialog = () => {
  const { count, hasSigned, sign, isSigning, isLoggedIn } = useManifestoSignatures();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
    <Dialog>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 px-5 py-3 sm:gap-1.5 sm:px-3 sm:py-1.5 bg-muted/50 backdrop-blur-sm text-foreground font-semibold text-base sm:text-sm rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <ScrollText className="h-5 w-5 sm:h-4 sm:w-4" />
          Manifesto
        </button>

      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl md:text-3xl text-foreground">
            Road to Renaissance
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 text-sm md:text-base leading-relaxed text-muted-foreground pt-2">
          <p className="text-foreground font-semibold text-base md:text-lg">
            The shift is already happening.
          </p>

          <p>
            Old assumptions are breaking faster than new ones can replace them. Institutions are changing. Trust is fragmenting. More people move through life with a quiet feeling that something important no longer fits.
          </p>

          <p>
            We have more information, more access, and more technology than any generation before us, yet many feel increasingly disconnected from meaning, community, and purpose.
          </p>

          <p>
            Work becomes abstract. Attention becomes fragmented. Noise grows louder while clarity becomes harder to find.
          </p>

          <p className="text-foreground font-medium">
            You can feel that something is changing.
          </p>

          <p>
            But many still struggle to find the right people, the right place, and the right environment to meet this moment well.
          </p>

          <div className="py-2 border-t border-b border-border/40">
            <p className="text-foreground font-semibold text-base md:text-lg mb-3">
              We are creating that place.
            </p>
            <p>
              A place for people who want to think clearly, live truthfully, and build what matters alongside others who feel the same pull.
            </p>
            <p className="mt-2">
              A place where technology, art, science, philosophy, culture, and human connection belong in the same conversation again.
            </p>
          </div>

          <p>
            We believe the most important work does not emerge from isolated ambition.
          </p>

          <div className="space-y-3 pl-4 border-l-2 border-primary/30">
            <p>
              The Renaissance was never created by a single genius.
            </p>
            <p>
              It emerged from cities, workshops, communities, and collisions of minds.
            </p>
            <p>
              Ideas moved through people.
            </p>
            <p>
              People moved through places.
            </p>
            <p>
              Networks created civilizations.
            </p>
          </div>

          <div className="py-2">
            <p className="text-foreground font-semibold text-base md:text-lg mb-3">
              Our goal is simple:
            </p>
            <p>
              To create places where a better future is not merely discussed —
            </p>
            <div className="pl-4 space-y-1 text-foreground font-medium">
              <p>but lived,</p>
              <p>practiced,</p>
              <p>and built.</p>
            </div>
            <p className="mt-3">
              And to connect these places into something larger.
            </p>
          </div>

          <p>
            Villedge is the coordination layer for a new generation of popup villages: a network connecting people, communities, ideas, and places working toward a new Renaissance.
          </p>

          <p className="text-foreground font-semibold text-base md:text-lg">
            Not one village.
          </p>
          <p className="text-foreground font-semibold text-lg md:text-xl">
            A civilization.
          </p>

          {/* X backlink */}
          <a
            href="https://x.com/villedgetech"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            <span className="font-bold text-base">𝕏</span>
            <span>@villedgetech</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          {/* Sign button */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Button
              onClick={() => sign()}
              disabled={hasSigned || isSigning || !isLoggedIn}
              variant={hasSigned ? "secondary" : "default"}
              className="gap-2"
            >
              {hasSigned ? (
                <>
                  <Check className="h-4 w-4" />
                  Signed
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4" />
                  Sign
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {count} {count === 1 ? "signature" : "signatures"}
            </span>
            {!isLoggedIn && !hasSigned && (
              <Button variant="outline" size="sm" onClick={() => setShowAuth(true)}>
                Log in to sign
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </>
  );
};
