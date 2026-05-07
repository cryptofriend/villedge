import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { LandingBlock, Village } from "@/hooks/useVillages";
import { supabase } from "@/integrations/supabase/client";
import { BLOCK_LIBRARY, newBlockId } from "./blockTypes";
import { LandingBlockRenderer } from "./LandingBlockRenderer";

interface LandingPageEditorProps {
  village: Village;
  onSaved?: () => void;
}

export const LandingPageEditor = ({ village, onSaved }: LandingPageEditorProps) => {
  const [blocks, setBlocks] = useState<LandingBlock[]>(village.landing_blocks || []);
  const [saving, setSaving] = useState(false);

  const updateBlock = (id: string, patch: Partial<LandingBlock>) =>
    setBlocks((b) => b.map((blk) => (blk.id === id ? { ...blk, ...patch } : blk)));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...blocks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next);
  };

  const add = (type: LandingBlock["type"]) =>
    setBlocks((b) => [...b, { id: newBlockId(), type, visible: true, props: {} }]);

  const remove = (id: string) => setBlocks((b) => b.filter((blk) => blk.id !== id));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("villages")
      .update({ landing_blocks: blocks as any })
      .eq("id", village.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save landing page");
      console.error(error);
      return;
    }
    toast.success("Landing page saved");
    onSaved?.();
  };

  const villageWithBlocks: Village = { ...village, landing_blocks: blocks };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor column */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">Blocks</h3>
            <p className="text-xs text-muted-foreground">
              Drag to reorder, toggle visibility, edit content.
            </p>
          </div>
          <Button onClick={save} disabled={saving} size="sm">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Save
          </Button>
        </div>

        <div className="space-y-2">
          {blocks.length === 0 && (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
              No blocks yet. Add one below.
            </p>
          )}
          {blocks.map((block, idx) => {
            const meta = BLOCK_LIBRARY.find((b) => b.type === block.type);
            const Icon = meta?.icon;
            return (
              <div
                key={block.id}
                className="rounded-lg border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="font-medium text-sm truncate">{meta?.label ?? block.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateBlock(block.id, { visible: !block.visible })}
                      title={block.visible ? "Hide" : "Show"}
                    >
                      {block.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(block.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {block.type === "markdown" && (
                  <Textarea
                    value={block.props?.content ?? ""}
                    placeholder="Write markdown… leave empty to use the village's About content."
                    rows={4}
                    onChange={(e) =>
                      updateBlock(block.id, { props: { ...block.props, content: e.target.value } })
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add block
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-2">
            <div className="space-y-1">
              {BLOCK_LIBRARY.map(({ type, label, description, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => add(type)}
                  className="w-full text-left flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Preview column */}
      <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[80vh] lg:overflow-auto">
        <h3 className="font-display text-base font-semibold mb-3">Preview</h3>
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add blocks to see a preview.</p>
          ) : (
            blocks.map((block) => (
              <LandingBlockRenderer key={block.id} block={block} village={villageWithBlocks} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
