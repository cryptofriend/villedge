import { ScrollText, PenLine, Check } from "lucide-react";
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 backdrop-blur-sm text-foreground font-semibold text-sm rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <ScrollText className="h-4 w-4" />
          Manifesto
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl md:text-3xl text-foreground">
            Road To Renaissance
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm md:text-base leading-relaxed text-muted-foreground pt-2">
          <p className="text-foreground font-medium text-base md:text-lg">
            The Shift is happening.
          </p>
          <p>
            Old assumptions are breaking faster than new ones can take their place. Conflict is rising, trust is thinning, and more people are moving through life with a quiet sense of confusion.
          </p>
          <p>
            Work feels increasingly abstract and detached from what matters. We have more access, more noise, more stimulation, and less clarity about how to live.
          </p>
          <p>
            You can feel that something important is changing, but can't yet find the right place, people, or rhythm to meet the moment well.
          </p>
          <p className="text-foreground font-medium">
            We are creating that place.
          </p>
          <p>
            A place for people who want to think clearly, live truthfully, and build what matters in the company of others doing the same. A place where technology, art, philosophy, culture, and research belong in the same conversation again.
          </p>
          <p>
            We believe the best work does not emerge from isolated ambition. It emerges from shared fields of trust, challenge, beauty, and serious play. From environments that invite people into deeper contact with themselves, each other, and the problems worth devoting a life to.
          </p>
          <p>
            We care not only about projects, but about conditions: food, rest, space, attention, conversation, rhythm, and belonging. We want to reduce the friction of survival and the noise of distraction so people can contribute from a deeper place.
          </p>
          <p className="text-foreground font-medium italic">
            The goal is simple: to create places where a better future is not merely discussed, but lived, practiced, and built.
          </p>

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
