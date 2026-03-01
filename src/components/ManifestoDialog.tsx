import { ScrollText, PenLine, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useManifestoSignatures } from "@/hooks/useManifestoSignatures";

export const ManifestoDialog = () => {
  const { count, hasSigned, sign, isSigning, isLoggedIn } = useManifestoSignatures();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 backdrop-blur-sm text-foreground font-semibold text-sm rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
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
            Something is breaking.
          </p>
          <p>
            People feel it in their bodies, their attention, their work, their relationships, and their sense of meaning. We are more connected than ever, yet more fragmented. More informed, yet less wise. Surrounded by content, yet starved for depth. Many of us are living between inspiration and exhaustion, between vision and isolation, between the feeling that something important is possible and the inability to find the right place to do it.
          </p>
          <p className="text-foreground font-medium">
            We are creating that place.
          </p>
          <p>
            A place for people who want to think clearly, live truthfully, and build what matters in the company of others doing the same. A place where technology, art, philosophy, culture, and research belong in the same conversation again. A place where curiosity is not a hobby, learning is not a phase, and meaningful work is not postponed until some imaginary future.
          </p>
          <p>
            We believe the best work does not emerge from isolated ambition. It emerges from shared fields of trust, challenge, beauty, and serious play. From environments that invite people into deeper contact with themselves, each other, and the problems worth devoting a life to.
          </p>
          <p>
            This is why we care not only about projects, but about conditions: food, rest, space, attention, conversation, rhythm, and belonging. We want to reduce the friction of survival and the noise of distraction so people can contribute from a deeper place.
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
              <span className="text-xs text-muted-foreground italic">Log in to sign</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
