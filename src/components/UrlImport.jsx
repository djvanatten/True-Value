import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPlayersQueryKey, getGetPlayersSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface ImportResult {
  added: number;
  skipped: number;
}

export function UrlImport() {
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [school, setSchool] = useState("");
  const [division, setDivision] = useState<"D1" | "D2" | "D3">("D2");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleImport() {
    if (!url.trim() || !school.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${BASE_URL}/api/players/import-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), school: school.trim(), division }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong importing that URL.");
        setStatus("error");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetPlayersSummaryQueryKey() });
      setResult({ added: data.added, skipped: data.skipped });
      setStatus("done");
    } catch {
      setErrorMsg("Network error — could not reach the import service.");
      setStatus("error");
    }
  }

  function handleReset() {
    setUrl("");
    setSchool("");
    setDivision("D2");
    setResult(null);
    setErrorMsg("");
    setStatus("idle");
  }

  const canSubmit = url.trim().length > 0 && school.trim().length > 0 && status !== "loading";

  return (
    <Card className="bg-card rounded-none border-border shadow-xl">
      <CardHeader className="border-b border-border bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg uppercase tracking-widest font-bold">Import Team from Website</CardTitle>
          </div>
          {status !== "idle" && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="rounded-none text-muted-foreground h-8">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="bg-muted/20 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-bold uppercase tracking-wider mb-1">How it works</p>
          <p>
            Paste the URL of a stats page that includes a table with columns like{" "}
            <span className="font-mono text-foreground">Name, AB, H, OBP, 2B, 3B, HR, K</span>.
            The importer scans the page's tables and extracts matching rows.
          </p>
          <p className="text-muted-foreground/60 text-[11px]">
            Works best with standard NCAA/school stats pages. JavaScript-rendered sites or PDFs are not supported.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Stats Page URL</Label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/baseball/stats"
              className="bg-background rounded-none font-mono text-sm"
              disabled={status === "loading" || status === "done"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">School Name</Label>
            <Input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. State University"
              className="bg-background rounded-none"
              disabled={status === "loading" || status === "done"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Division</Label>
            <Select
              value={division}
              onValueChange={(v) => setDivision(v as "D1" | "D2" | "D3")}
              disabled={status === "loading" || status === "done"}
            >
              <SelectTrigger className="bg-background rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="D1">Division I</SelectItem>
                <SelectItem value="D2">Division II</SelectItem>
                <SelectItem value="D3">Division III</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {status === "error" && (
          <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {status === "done" && result && (
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-green-500/30 bg-green-500/10 p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-numbers font-bold text-green-400">{result.added}</div>
              <div className="text-xs uppercase tracking-wider text-green-400/70 mt-1">Players Imported</div>
            </div>
            <div className="border border-border bg-muted/10 p-4 text-center">
              <div className="text-3xl font-numbers font-bold text-muted-foreground">{result.skipped}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mt-1">Rows Skipped</div>
            </div>
          </div>
        )}

        {status !== "done" && (
          <Button
            onClick={handleImport}
            disabled={!canSubmit}
            className="w-full rounded-none uppercase tracking-widest font-bold h-11"
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </span>
            ) : (
              "Import Team"
            )}
          </Button>
        )}

        {status === "done" && (
          <Button onClick={handleReset} variant="outline" className="w-full rounded-none uppercase tracking-widest">
            Import Another Team
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

