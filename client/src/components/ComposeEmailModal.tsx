import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface ComposeEmailModalProps {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  dealId?: number;
}

export function ComposeEmailModal({
  open,
  onClose,
  defaultTo = "",
  defaultSubject = "",
  dealId,
}: ComposeEmailModalProps) {
  const { toast } = useToast();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody("");
    }
  }, [open, defaultTo, defaultSubject]);

  const { data: accountData, isLoading: accountLoading } = useQuery<{ account: { id: number; emailAddress: string; provider: string } | null }>({
    queryKey: ["/api/email/account"],
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email/compose", {
        to,
        subject,
        body,
        dealId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: `Email sent to ${to}` });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const hasAccount = !!accountData?.account;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) return;
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-compose-email">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </DialogTitle>
        </DialogHeader>

        {accountLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="compose-loading">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAccount ? (
          <div className="py-6 text-center space-y-4" data-testid="compose-no-account">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <LinkIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No email account connected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your Gmail or Outlook account to send emails directly from the platform.
              </p>
            </div>
            <Link href="/admin/integrations">
              <Button data-testid="button-connect-email">
                Connect Email Account
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Sending from: {accountData.account!.emailAddress}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compose-to">To</Label>
              <Input
                id="compose-to"
                type="email"
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                data-testid="input-compose-to"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compose-subject">Subject</Label>
              <Input
                id="compose-subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                data-testid="input-compose-subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compose-body">Message</Label>
              <Textarea
                id="compose-body"
                placeholder="Write your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={6}
                className="resize-none"
                data-testid="input-compose-body"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={sendMutation.isPending}
                data-testid="button-compose-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendMutation.isPending || !to || !subject || !body}
                data-testid="button-compose-send"
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Sending...
                  </>
                ) : (
                  "Send Email"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
