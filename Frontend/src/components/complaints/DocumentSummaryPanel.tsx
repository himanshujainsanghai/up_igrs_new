/**
 * Document Summary Panel
 * Fetches and displays document summary history; allows generating new summary with optional user prompt.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Loader2,
  Sparkles,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { aiService } from "@/services/ai.service";
import { DocumentSummaryRecord } from "@/types";
import { toast } from "sonner";

interface DocumentSummaryPanelProps {
  complaintId: string;
  className?: string;
}

export default function DocumentSummaryPanel({
  complaintId,
  className = "",
}: DocumentSummaryPanelProps) {
  const [summaries, setSummaries] = useState<DocumentSummaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [useComplaintContext, setUseComplaintContext] = useState(true);

  const fetchSummaries = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    try {
      const res = await aiService.listDocumentSummaries(complaintId);
      const data = res?.data ?? res;
      const list = Array.isArray((data as any)?.summaries)
        ? (data as any).summaries
        : [];
      setSummaries(list);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load summaries");
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleGenerate = async () => {
    if (!complaintId) return;
    setGenerating(true);
    try {
      const res = await aiService.summarizeDocuments(complaintId, {
        useComplaintContext,
        user_prompt: userPrompt.trim() || undefined,
      });
      const data = res?.data ?? res;
      const summary = (data as any)?.summary;
      if (summary != null) {
        toast.success("Summary generated and saved");
        setUserPrompt("");
        await fetchSummaries();
      } else {
        toast.error("No summary in response");
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to generate summary";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className={`border-[#011a60]/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Document summaries</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated summaries from complaint attachments. Generate a new one
          or browse history.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate new */}
        <div className="rounded-lg border border-[#011a60]/20 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            Generate new summary
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="user-prompt"
              className="text-xs text-muted-foreground"
            >
              Optional instruction (e.g. &quot;Focus on dates and amounts&quot;)
            </Label>
            <Textarea
              id="user-prompt"
              placeholder="Add optional instruction for the AI..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={useComplaintContext}
                onChange={(e) => setUseComplaintContext(e.target.checked)}
                className="rounded border-input"
              />
              Use complaint context (title, description, area)
            </label>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate summary
                </>
              )}
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Summary history</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSummaries}
              disabled={loading}
              className="h-8 gap-1"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refresh
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading…
            </div>
          ) : summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-dashed">
              No summaries yet. Generate one above.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {summaries.map((s, i) => (
                <AccordionItem key={s.id} value={s.id}>
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex flex-wrap items-center gap-2 text-left">
                      <span className="text-sm font-medium">
                        {formatDate(s.created_at)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {s.document_count} doc
                        {s.document_count !== 1 ? "s" : ""}
                      </Badge>
                      {s.use_complaint_context && (
                        <Badge variant="outline" className="text-xs">
                          With context
                        </Badge>
                      )}
                      {s.user_prompt && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground max-w-[200px] truncate"
                          title={s.user_prompt}
                        >
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          Custom prompt
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    {s.user_prompt && (
                      <div className="mb-2 rounded bg-muted/50 p-2 text-xs">
                        <span className="text-muted-foreground">
                          Instruction:{" "}
                        </span>
                        <span className="text-foreground">{s.user_prompt}</span>
                      </div>
                    )}
                    <div className="text-sm text-foreground whitespace-pre-wrap rounded border border-[#011a60]/10 p-3 bg-background">
                      {s.summary}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
