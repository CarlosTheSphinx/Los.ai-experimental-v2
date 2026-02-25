import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/phase1/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TabComms({
  deal,
  activities,
  dealId,
}: {
  deal: any;
  activities: any[];
  dealId: string;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [activeView, setActiveView] = useState<"messages" | "activity">("messages");

  // Fetch threads for this deal
  const { data: threadsData, refetch: refetchThreads } = useQuery<{ threads: any[] }>({
    queryKey: ["/api/messages/threads", { dealId }],
    queryFn: async () => {
      const res = await fetch(`/api/messages/threads?dealId=${dealId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
    enabled: !!dealId,
  });

  const currentThread = threadsData?.threads?.[0];

  const { data: threadMessagesData, refetch: refetchMessages } = useQuery<{ thread: any; messages: any[] }>({
    queryKey: ["/api/messages/threads", currentThread?.id],
    queryFn: async () => {
      const res = await fetch(`/api/messages/threads/${currentThread!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!currentThread?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, body }: { threadId: number; body: string }) => {
      return apiRequest("POST", `/api/messages/threads/${threadId}/messages`, { body, type: "message" });
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      refetchThreads();
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const threadRes = await apiRequest("POST", "/api/messages/threads", {
        dealId: Number(dealId),
        userId: user!.id,
        subject: "Message about loan",
      });
      const threadData = await threadRes.json();
      await apiRequest("POST", `/api/messages/threads/${threadData.thread.id}/messages`, {
        body: message,
        type: "message",
      });
      return threadData;
    },
    onSuccess: () => {
      setNewMessage("");
      refetchThreads();
      toast({ title: "Message sent" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const messages = threadMessagesData?.messages || [];

  const handleSend = () => {
    if (!newMessage.trim()) return;
    if (currentThread) {
      sendMessageMutation.mutate({ threadId: currentThread.id, body: newMessage });
    } else {
      createThreadMutation.mutate({ message: newMessage });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView("messages")}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            activeView === "messages" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-3 w-3 inline mr-1.5" />
          Messages
        </button>
        <button
          onClick={() => setActiveView("activity")}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            activeView === "activity" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3 w-3 inline mr-1.5" />
          Activity ({activities.length})
        </button>
      </div>

      {activeView === "messages" ? (
        <div className="space-y-3">
          {/* Message List */}
          {messages.length === 0 && !currentThread ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Start a conversation about this deal."
            />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] ${
                      msg.senderId === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.senderName && msg.senderId !== user?.id && (
                      <p className="text-[11px] font-medium mb-0.5 opacity-70">{msg.senderName}</p>
                    )}
                    <p>{msg.body}</p>
                    <p className="text-[10px] mt-1 opacity-60">{timeAgo(msg.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Compose */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="text-[13px] min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="sm"
              className="self-end"
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMessageMutation.isPending || createThreadMutation.isPending}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        /* Activity Log */
        <div className="space-y-1">
          {activities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Activity will be logged as the deal progresses."
            />
          ) : (
            activities.map((item: any) => (
              <div key={item.id} className="flex items-start gap-3 py-2 px-3 text-[12px]">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{item.activityDescription || item.description}</p>
                  <p className="text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
