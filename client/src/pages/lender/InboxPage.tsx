import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, Mail, Inbox, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThreadList, type EmailThread } from "@/components/email/ThreadList";
import { ThreadDetail } from "@/components/email/ThreadDetail";

export default function LenderInboxPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const urlThreadId = searchParams.get("threadId");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<number | null>(
    urlThreadId ? parseInt(urlThreadId) : null
  );
  const [filterUnread, setFilterUnread] = useState<string>("all");
  const justConnected = searchParams.get("success") === "email_connected";

  // Fetch email account
  const { data: accountData } = useQuery<{ account: { emailAddress: string; isActive: boolean } | null }>({
    queryKey: ["/api/email/account"],
  });

  // Fetch threads
  const { data: threadsData, isLoading: threadsLoading, refetch: refetchThreads } = useQuery<{
    threads: EmailThread[];
    total: number;
  }>({
    queryKey: ["/api/email/threads"],
    enabled: !!accountData?.account,
    refetchInterval: 30_000,
  });

  // Fetch active thread detail
  const { data: threadDetailData, isLoading: detailLoading } = useQuery<{
    thread: { id: number; subject: string | null; fromName: string | null; fromAddress: string | null; isUnread: boolean };
    messages: any[];
  }>({
    queryKey: [`/api/email/threads/${activeThreadId}`],
    enabled: activeThreadId !== null,
  });

  // Mark read when opening a thread
  const markReadMutation = useMutation({
    mutationFn: async (threadId: number) => {
      await apiRequest("POST", `/api/email/threads/${threadId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email/sync");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Synced", description: `${data.synced ?? 0} messages synced.` });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
    },
    onError: () => {
      toast({ title: "Sync failed", variant: "destructive" });
    },
  });

  // When the user returns from Google OAuth, auto-sync and then refetch.
  useEffect(() => {
    if (!justConnected || !accountData?.account) return;
    syncMutation.mutate(undefined, {
      onSettled: () => {
        refetchThreads();
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConnected, accountData?.account?.emailAddress]);

  function handleSelectThread(threadId: number) {
    setActiveThreadId(threadId);
    const thread = threadsData?.threads.find((t) => t.id === threadId);
    if (thread?.isUnread) {
      markReadMutation.mutate(threadId);
    }
  }

  // Filter threads
  const allThreads = threadsData?.threads ?? [];
  const filtered = allThreads.filter((t) => {
    if (filterUnread === "unread" && !t.isUnread) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.subject?.toLowerCase().includes(q) ||
        t.fromName?.toLowerCase().includes(q) ||
        t.fromAddress?.toLowerCase().includes(q) ||
        t.snippet?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = allThreads.filter((t) => t.isUnread).length;

  // No email account connected
  if (accountData && !accountData.account) {
    return (
      <div className="min-h-screen bg-[#0F1729] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Mail className="h-16 w-16 text-gray-500 mx-auto" />
          <h2 className="text-xl font-semibold text-white">No email account connected</h2>
          <p className="text-gray-400 text-sm">Connect your Gmail account to access your inbox.</p>
          <Button
            className="bg-[#C9A84C] hover:bg-[#b8973b] text-white"
            onClick={() => window.location.href = "/api/email/connect?returnTo=/lender/inbox"}
          >
            Connect Gmail
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1729] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#111827] border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-[#C9A84C]" />
          <h1 className="text-white font-semibold">Email Inbox</h1>
          {unreadCount > 0 && (
            <Badge className="bg-[#C9A84C] text-black text-xs px-1.5 py-0">
              {unreadCount}
            </Badge>
          )}
          {accountData?.account && (
            <span className="text-xs text-gray-500 ml-2">{accountData.account.emailAddress}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Thread list panel */}
        <div className={`flex flex-col border-r border-gray-700 ${activeThreadId ? "hidden md:flex md:w-80 lg:w-96" : "flex-1 md:w-80 lg:w-96"}`}>
          {/* Search + filter */}
          <div className="px-3 py-2 border-b border-gray-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <Input
                placeholder="Search threads…"
                className="pl-8 h-8 text-sm bg-[#1a2332] border-gray-600 text-white placeholder:text-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterUnread} onValueChange={setFilterUnread}>
              <SelectTrigger className="h-7 text-xs bg-[#1a2332] border-gray-600 text-gray-300">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                <SelectItem value="all">All threads</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          <div className="flex-1 overflow-hidden">
            {threadsLoading || syncMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                {syncMutation.isPending && (
                  <p className="text-xs text-gray-500">Syncing emails…</p>
                )}
              </div>
            ) : (
              <ThreadList
                threads={filtered}
                activeThreadId={activeThreadId}
                onSelectThread={handleSelectThread}
              />
            )}
          </div>
        </div>

        {/* Thread detail panel */}
        <div className={`flex-1 overflow-hidden ${!activeThreadId ? "hidden md:flex items-center justify-center" : "flex flex-col"}`}>
          {activeThreadId ? (
            detailLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : threadDetailData ? (
              <ThreadDetail
                data={threadDetailData}
                onBack={() => setActiveThreadId(null)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Thread not found
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
              <Mail className="h-12 w-12 opacity-30" />
              <p className="text-sm">Select a thread to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
