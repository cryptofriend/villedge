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
import { SEO } from "@/components/SEO";

const Widget = () => {
  const { villages, loading } = useVillages();
  const popups = useMemo(
    () => villages.filter((v) => v.village_type === "popup"),
    [villages],
  );

  const [centerVillage, setCenterVillage] = useState<string>("");
  const [zoom, setZoom] = useState<string>("6");
  const [width, setWidth] = useState<string>("100%");
  const [height, setHeight] = useState<string>("520");
  const [copied, setCopied] = useState(false);

  // Residents widget state
  const [resVillage, setResVillage] = useState<string>("");
  const [resInteractive, setResInteractive] = useState<string>("interactive");
  const [resWidth, setResWidth] = useState<string>("100%");
  const [resHeight, setResHeight] = useState<string>("700");
  const [resCopied, setResCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://villedge.tech";
  const docsOrigin = "https://villedge.tech";

  const src = useMemo(() => {
    const u = new URL(`${origin}/embed`);
    if (centerVillage) u.searchParams.set("village", centerVillage);
    if (zoom) u.searchParams.set("zoom", zoom);
    return u.toString();
  }, [origin, centerVillage, zoom]);

  const snippet = `<iframe
  src="${src}"
  width="${width}"
  height="${height}"
  style="border:0;border-radius:12px;overflow:hidden;max-width:100%;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  title="Villedge map"
></iframe>`;

  const resSrc = useMemo(() => {
    if (!resVillage) return "";
    const u = new URL(`${origin}/embed/${resVillage}/residents`);
    if (resInteractive === "readonly") u.searchParams.set("mode", "readonly");
    return u.toString();
  }, [origin, resVillage, resInteractive]);

  const resSnippet = resVillage
    ? `<iframe
  id="villedge-residents"
  src="${resSrc}"
  width="${resWidth}"
  height="${resHeight}"
  style="border:0;border-radius:12px;overflow:hidden;max-width:100%;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
  title="Villedge residents"
></iframe>
<script>
  // Optional: react to events from the residents widget
  window.addEventListener("message", (e) => {
    if (!e.data || typeof e.data !== "object") return;
    if (!String(e.data.type || "").startsWith("villedge:")) return;
    // e.data.type can be: villedge:residents-loaded | villedge:residents-changed
    // | villedge:add-resident-clicked | villedge:resize
    if (e.data.type === "villedge:resize") {
      const f = document.getElementById("villedge-residents");
      if (f && e.data.height) f.style.height = e.data.height + "px";
    }
    console.log("[villedge]", e.data);
  });
</script>`
    : "";

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyRes = async () => {
    if (!resSnippet) return;
    await navigator.clipboard.writeText(resSnippet);
    setResCopied(true);
    setTimeout(() => setResCopied(false), 1500);
  };

  return (
    <>
      <SEO
        title="Embed the Villedge map — widget for popup villages"
        description="Copy a one-line snippet to embed the live Villedge map of popup villages on your own site. Choose the centered village and size."
        path="/widget"
      />
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              Embed the Villedge map
            </h1>
            <p className="mt-2 max-w-2xl font-body text-sm text-muted-foreground sm:text-base">
              Drop our live map of popup villages into any website with one snippet.
              Optionally choose which village should be highlighted at the center when
              the widget loads.
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
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-foreground">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">village</code>
                <span className="ml-2 text-muted-foreground">
                  Slug of the popup to center the map on (optional).
                </span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">zoom</code>
                <span className="ml-2 text-muted-foreground">
                  Initial zoom level (1–18, default 6).
                </span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">mode</code>
                <span className="ml-2 text-muted-foreground">
                  <code className="rounded bg-muted px-1">villages</code> (default) or{" "}
                  <code className="rounded bg-muted px-1">spots</code> for the legacy
                  single-village spots map.
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
    </>
  );
};

export default Widget;
