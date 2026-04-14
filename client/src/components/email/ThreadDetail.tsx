import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, Paperclip, Download, Pin, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { safeFormat } from "@/lib/utils";

interface EmailMessage {
  id: number;
  threadId: number;
  fromAddress: string | null;
  fromName: string | null;
  toAddresses: string[] | null;
  ccAddresses: string[] | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId: string }> | null;
  internalDate: string | null;
  isUnread: boolean;
}

interface ThreadDetailData {
  thread: {
    id: number;
    subject: string | null;
    fromName: string | null;
    fromAddress: string | null;
    isUnread: boolean;
    pinnedSubmissionId?: number | null;
  };
  messages: EmailMessage[];
}

interface ThreadDetailProps {
  data: ThreadDetailData;
  onBack: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ThreadDetail({ data, onBack }: ThreadDetailProps) {
  const { toast } = useToast();
  const { thread, messages } = data;
  const isPinned = !!thread.pinnedSubmissionId;

  const pinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/email/threads/${thread.id}/pin-to-pipeline`);
      return res.json();
    },
    onSuccess: (result) => {
      if (result.alreadyPinned) {
        toast({ title: "Already pinned", description: "This thread is already in the pipeline." });
      } else {
        toast({ title: "Deal pinned", description: result.message });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
      queryClient.invalidateQueries({ queryKey: [`/api/email/threads/${thread.id}`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to pin to pipeline.", variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white p-1 h-auto"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-white truncate">
            {thread.subject || "(no subject)"}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPinned ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="border-green-700 text-green-400 bg-transparent cursor-default"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Pinned to Pipeline
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-[#C9A84C] text-[#C9A84C] bg-transparent hover:bg-[#C9A84C]/10"
              onClick={() => pinMutation.mutate()}
              disabled={pinMutation.isPending}
            >
              {pinMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Pin className="h-4 w-4 mr-1.5" />
              )}
              Pin to Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="bg-[#1a2332] rounded-lg border border-gray-700 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-700 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">
                    {message.fromName || message.fromAddress || "Unknown"}
                    {message.fromAddress && message.fromName && (
                      <span className="text-gray-400 font-normal ml-1 text-xs">
                        &lt;{message.fromAddress}&gt;
                      </span>
                    )}
                  </p>
                  {message.toAddresses && message.toAddresses.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      To: {message.toAddresses.slice(0, 3).join(", ")}
                      {message.toAddresses.length > 3 && ` +${message.toAddresses.length - 3} more`}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {message.internalDate ? safeFormat(message.internalDate, "MMM d, h:mm a") : ""}
                </span>
              </div>
              <div className="px-4 py-3">
                {message.bodyText ? (
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {message.bodyText.slice(0, 2000)}
                    {message.bodyText.length > 2000 && (
                      <span className="text-gray-500"> …(truncated)</span>
                    )}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500 italic">{message.snippet || "(no content)"}</p>
                )}
              </div>
              {message.attachments && message.attachments.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-700 flex flex-wrap gap-2">
                  {message.attachments.map((att) => (
                    <a
                      key={att.attachmentId}
                      href={`/api/email/messages/${message.id}/attachments/${att.attachmentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-[#0f1729] rounded px-2 py-1 border border-gray-600"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{att.filename}</span>
                      <span className="text-gray-500">({formatBytes(att.size)})</span>
                      <Download className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
