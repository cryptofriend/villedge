import { useMemo, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useVillages } from "@/hooks/useVillages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Mode = "global" | "village";

const Widget = () => {
  const { villages, loading } = useVillages();
  const popups = useMemo(
    () => villages.filter((v) => v.village_type === "popup"),
    [villages],
  );
  const allVillages = villages;

  const [mode, setMode] = useState<Mode>("global");

  // Global mode state
  const [centerVillage, setCenterVillage] = useState<string>("");
  const [zoom, setZoom] = useState<string>("6");

  // Village mode state
  const [villageId, setVillageId] = useState<string>("");

  // Shared sizing
  const [width, setWidth] = useState<string>("100%");
  const [height, setHeight] = useState<string>("520");
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://villedge.tech";
  const docsOrigin = "https://villedge.tech";

  const src = useMemo(() => {
    const u = new URL(`${origin}/embed`);
    if (mode === "global") {
      if (centerVillage) u.searchParams.set("village", centerVillage);
      if (zoom) u.searchParams.set("zoom", zoom);
    } else {
      u.searchParams.set("mode", "spots");
      if (villageId) u.searchParams.set("village", villageId);
    }
    return u.toString();
  }, [origin, mode, centerVillage, zoom, villageId]);

  const titleAttr = mode === "village"
    ? `Villedge village map${villageId ? ` — ${allVillages.find(v => v.id === villageId)?.name ?? ""}` : ""}`
    : "Villedge map";

  const snippet = `<iframe
  src="${src}"
  width="${width}"
  height="${height}"
  style="border:0;border-radius:12px;overflow:hidden;max-width:100%;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  title="${titleAttr}"
></iframe>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              Embed the Villedge map
            </h1>
            <p className="mt-2 max-w-2xl font-body text-sm text-muted-foreground sm:text-base">
              Drop our live maps into any website with one snippet. Embed the global
              map of all popup villages, or zoom into a single village's spots map.
            </p>
          </div>
          <a
            href={origin}
            className="hidden items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 sm:inline-flex"
          >
            Villedge
            <ExternalLink className="h-3 w-3" />
          </a>
        </header>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="global">Global villages map</TabsTrigger>
            <TabsTrigger value="village">Single village map</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. Configure</CardTitle>
                  <CardDescription>Pick the centered village and size.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="village">Center village</Label>
                    <Select value={centerVillage} onValueChange={setCenterVillage}>
                      <SelectTrigger id="village">
                        <SelectValue
                          placeholder={loading ? "Loading…" : "Default (first popup)"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {popups.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                            {v.location ? ` — ${v.location}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="zoom">Zoom</Label>
                      <Input
                        id="zoom"
                        type="number"
                        min={1}
                        max={18}
                        value={zoom}
                        onChange={(e) => setZoom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="w">Width</Label>
                      <Input
                        id="w"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="h">Height</Label>
                      <Input
                        id="h"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. Preview</CardTitle>
                  <CardDescription>Live preview of your embed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-md border border-border">
                    <iframe
                      src={src}
                      width="100%"
                      height={280}
                      style={{ border: 0, display: "block" }}
                      loading="lazy"
                      title="Villedge embed preview"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="village" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. Pick a village</CardTitle>
                  <CardDescription>
                    Embeds the village's spots map (stays, food, activities, etc.).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="village-pick">Village</Label>
                    <Select value={villageId} onValueChange={setVillageId}>
                      <SelectTrigger id="village-pick">
                        <SelectValue
                          placeholder={loading ? "Loading…" : "Choose a village"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {allVillages.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                            {v.location ? ` — ${v.location}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="vw">Width</Label>
                      <Input
                        id="vw"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vh">Height</Label>
                      <Input
                        id="vh"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. Preview</CardTitle>
                  <CardDescription>
                    {villageId
                      ? "Live preview of the village spots map."
                      : "Pick a village to see the preview."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-md border border-border">
                    {villageId ? (
                      <iframe
                        src={src}
                        width="100%"
                        height={280}
                        style={{ border: 0, display: "block" }}
                        loading="lazy"
                        title="Villedge village embed preview"
                      />
                    ) : (
                      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                        No village selected
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-lg">3. Copy the snippet</CardTitle>
              <CardDescription>
                Paste this HTML wherever you want the map to appear.
              </CardDescription>
            </div>
            <Button onClick={copy} size="sm" variant="outline" className="shrink-0">
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
              <code>{snippet}</code>
            </pre>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">URL parameters</CardTitle>
            <CardDescription>
              You can also build the embed URL manually:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {docsOrigin}/embed?village=&lt;slug&gt;&zoom=6
              </code>{" "}
              or{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {docsOrigin}/embed?mode=spots&village=&lt;slug&gt;
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-foreground">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">mode</code>
                <span className="ml-2 text-muted-foreground">
                  <code className="rounded bg-muted px-1">villages</code> (default,
                  global popup villages map) or{" "}
                  <code className="rounded bg-muted px-1">spots</code> for a single
                  village's spots map.
                </span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">village</code>
                <span className="ml-2 text-muted-foreground">
                  Slug of the village. In global mode, centers the map on it. In
                  spots mode, selects which village's spots to show.
                </span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">zoom</code>
                <span className="ml-2 text-muted-foreground">
                  Initial zoom level for global mode (1–18, default 6).
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• The widget is responsive — set <code>width="100%"</code> and a fixed pixel height.</p>
            <p>• Clicking a marker opens that village in a new tab on villedge.tech.</p>
            <p>• No script tags or API keys required.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Widget;
