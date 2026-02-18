import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, CheckCircle2, XCircle, RefreshCw, Unplug, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EmailAccount {
  id: number;
  emailAddress: string;
  provider: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  createdAt: string;
}

export default function EmailIntegrationConfig() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ account: EmailAccount | null }>({
    queryKey: ["/api/email/account"],
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email/sync"),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/email/account"] });
      toast({
        title: "Email Sync Complete",
        description: `Synced ${result.synced} threads${result.errors?.length ? ` with ${result.errors.length} errors` : ""}`,
      });
    },
    onError: () => {
      toast({ title: "Sync Failed", description: "Could not sync emails. Please try again.", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/account"] });
      toast({ title: "Email Disconnected", description: "Your email account has been disconnected." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect email.", variant: "destructive" });
    },
  });

  const account = data?.account;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Integration
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to sync emails, link conversations to deals, and manage communications in one place
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {account ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="font-medium">{account.emailAddress}</span>
                </div>
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending || account.syncStatus === 'syncing'}
                  data-testid="button-sync-email"
                >
                  {syncMutation.isPending || account.syncStatus === 'syncing' ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  data-testid="button-disconnect-email"
                >
                  <Unplug className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Provider</span>
                <p className="font-medium capitalize">{account.provider}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Synced</span>
                <p className="font-medium">
                  {account.lastSyncAt
                    ? format(new Date(account.lastSyncAt), "MMM d, yyyy h:mm a")
                    : "Never"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium capitalize">{account.syncStatus}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Connected Since</span>
                <p className="font-medium">
                  {format(new Date(account.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No Email Account Connected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your Gmail to sync emails and link conversations to deals
              </p>
            </div>
            <Button
              onClick={() => window.location.href = '/api/email/connect?returnTo=' + encodeURIComponent('/admin/settings?tab=integrations')}
              data-testid="button-connect-email"
            >
              <Mail className="h-4 w-4 mr-2" />
              Connect Gmail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
