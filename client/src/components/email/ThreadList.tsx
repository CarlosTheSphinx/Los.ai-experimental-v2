import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mail, Paperclip, Pin, CheckCircle2, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { safeRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface EmailThread {
  id: number;
  accountId: number;
  gmailThreadId: string;
  subject: string | null;
  snippet: string | null;
  fromAddress: string | null;
  fromName: string | null;
  participants: string[] | null;
  messageCount: number;
  hasAttachments: boolean;
  isUnread: boolean;
  lastMessageAt: string | null;
  linkedDealIds: number[];
  pinnedSubmissionId?: number | null;
}

interface ThreadListProps {
  threads: EmailThread[];
  activeThreadId: number | null;
  onSelectThread: (threadId: number) => void;
  onThreadDeleted?: (threadId: number) => void;
}

export function ThreadList({ threads, activeThreadId, onSelectThread, onThreadDeleted }: ThreadListProps) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (threadId: number) => {
      const res = await apiRequest("DELETE", `/api/email/threads/${threadId}`);
      if (!res.ok) throw new Error("Failed to delete");
      return threadId;
    },
    onSuccess: (threadId) => {
      toast({ title: "Thread deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
      onThreadDeleted?.(threadId);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete thread.", variant: "destructive" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (threadId: number) => {
      const res = await apiRequest("POST", `/api/email/threads/${threadId}/pin-to-pipeline`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.alreadyPinned) {
        toast({ title: "Already pinned", description: "This thread is already in the pipeline." });
      } else {
        toast({ title: "Deal pinned", description: data.message });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to pin to pipeline.", variant: "destructive" });
    },
  });

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
        <Mail className="h-10 w-10 opacity-40" />
        <p className="text-sm">No threads found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-gray-700">
        {threads.map((thread) => {
          const isPinned = !!thread.pinnedSubmissionId;
          const isActive = thread.id === activeThreadId;
          return (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={cn(
                "p-3 cursor-pointer hover:bg-[#1e2d40] transition-colors",
                isActive && "bg-[#1e2d40] border-l-2 border-[#C9A84C]",
                thread.isUnread && !isActive && "bg-[#172030]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {thread.isUnread && (
                      <span className="h-2 w-2 rounded-full bg-[#C9A84C] flex-shrink-0" />
                    )}
                    <span className={cn("text-sm truncate", thread.isUnread ? "font-semibold text-white" : "text-gray-300")}>
                      {thread.fromName || thread.fromAddress || "Unknown"}
                    </span>
                  </div>
                  <p className={cn("text-xs truncate mb-0.5", thread.isUnread ? "text-white font-medium" : "text-gray-400")}>
                    {thread.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{thread.snippet}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {thread.lastMessageAt ? safeRelativeTime(thread.lastMessageAt) : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    {thread.hasAttachments && <Paperclip className="h-3 w-3 text-gray-500" />}
                    {thread.linkedDealIds.length > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-500 text-blue-400">
                        linked
                      </Badge>
                    )}
                    {isPinned && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-green-500 text-green-400">
                        pinned
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                {isPinned ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="h-6 text-xs px-2 border-green-700 text-green-400 bg-transparent cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Pinned
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-[#C9A84C] text-[#C9A84C] bg-transparent hover:bg-[#C9A84C]/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      pinMutation.mutate(thread.id);
                    }}
                    disabled={pinMutation.isPending}
                  >
                    {pinMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Pin className="h-3 w-3 mr-1" />
                        Pin to Pipeline
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this thread? This cannot be undone.")) {
                      deleteMutation.mutate(thread.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  title="Delete thread"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
