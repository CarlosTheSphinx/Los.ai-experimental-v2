import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Key,
  Plus,
  Copy,
  RotateCw,
  Trash2,
  Shield,
  Clock,
  Activity,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

const SCOPE_CATEGORIES = [
  {
    name: "Deal Management",
    scopes: [
      { id: "deals:read", label: "Read Deals" },
      { id: "deals:write", label: "Write Deals" },
      { id: "deals:delete", label: "Delete Deals", critical: true },
    ],
  },
  {
    name: "Document Management",
    scopes: [
      { id: "documents:read", label: "Read Documents" },
      { id: "documents:write", label: "Write Documents" },
      { id: "documents:sign", label: "Sign Documents" },
    ],
  },
  {
    name: "Borrower Profiles",
    scopes: [
      { id: "borrowers:read", label: "Read Borrowers" },
      { id: "borrowers:write", label: "Write Borrowers" },
      { id: "borrowers:pii", label: "Access PII", critical: true },
    ],
  },
  {
    name: "Financial Data",
    scopes: [
      { id: "financials:read", label: "Read Financials" },
      { id: "financials:write", label: "Write Financials" },
    ],
  },
  {
    name: "Reports & Exports",
    scopes: [
      { id: "reports:read", label: "Read Reports" },
      { id: "reports:export", label: "Export Reports" },
      { id: "reports:data_dump", label: "Data Dump", critical: true },
    ],
  },
  {
    name: "Webhooks",
    scopes: [
      { id: "webhooks:read", label: "Read Webhooks" },
      { id: "webhooks:write", label: "Write Webhooks" },
      { id: "webhooks:manage", label: "Manage Webhooks" },
    ],
  },
];

interface ApiKeyItem {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  isRevoked: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyPlaintext, setNewKeyPlaintext] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyExpiration, setKeyExpiration] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ApiKeyItem | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);

  const { data, isLoading } = useQuery<{ keys: ApiKeyItem[] }>({
    queryKey: ["/api/user/api-keys"],
  });

  const keys = data?.keys || [];

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; scopes: string[]; expiresAt?: string }) => {
      const res = await apiRequest("POST", "/api/user/api-keys", payload);
      return res.json();
    },
    onSuccess: (data) => {
      setNewKeyPlaintext(data.keyPlaintext);
      setNewKeyName(data.name);
      setShowCreateDialog(false);
      setShowKeyDialog(true);
      setKeyName("");
      setKeyExpiration("");
      setSelectedScopes([]);
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      toast({ title: "API key created", description: "Make sure to copy and save it now." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create key", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await apiRequest("DELETE", `/api/user/api-keys/${keyId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      setRevokeTarget(null);
      toast({ title: "API key revoked" });
    },
  });

  const rotateMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await apiRequest("POST", `/api/user/api-keys/${keyId}/rotate`);
      return res.json();
    },
    onSuccess: (data) => {
      setNewKeyPlaintext(data.newKeyPlaintext);
      setNewKeyName("Rotated Key");
      setShowKeyDialog(true);
      setRotateTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      toast({ title: "API key rotated", description: "Old key has been revoked. Save the new one." });
    },
  });

  const handleCreate = () => {
    if (!keyName.trim()) return;
    if (selectedScopes.length === 0) {
      toast({ title: "Select at least one scope", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: keyName.trim(),
      scopes: selectedScopes,
      expiresAt: keyExpiration || undefined,
    });
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(newKeyPlaintext);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const activeKeys = keys.filter((k) => !k.isRevoked);
  const revokedKeys = keys.filter((k) => k.isRevoked);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold" data-testid="text-page-title">API Keys</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Create and manage API keys for programmatic access to your account.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-api-key"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-[10px] shadow-sm" data-testid="card-stat-active">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Key className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Keys</p>
                <p className="text-2xl font-bold" data-testid="text-active-count">{activeKeys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] shadow-sm" data-testid="card-stat-revoked">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revoked Keys</p>
                <p className="text-2xl font-bold" data-testid="text-revoked-count">{revokedKeys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] shadow-sm" data-testid="card-stat-total-usage">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total API Calls</p>
                <p className="text-2xl font-bold" data-testid="text-total-usage">
                  {keys.reduce((sum, k) => sum + (k.usageCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="rounded-[10px] shadow-sm animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : keys.length === 0 ? (
        <Card className="rounded-[10px] shadow-sm" data-testid="card-empty-state">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Key className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API Keys Yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Create your first API key to start integrating with the platform programmatically.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-key">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeKeys.map((key) => (
            <Card key={key.id} className="rounded-[10px] shadow-sm" data-testid={`card-api-key-${key.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[17px] font-semibold" data-testid={`text-key-name-${key.id}`}>
                        {key.name}
                      </h3>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-500/10">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded" data-testid={`text-key-prefix-${key.id}`}>
                        {key.keyPrefix}...
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      {key.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                      <span>{key.usageCount || 0} calls</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {((key.scopes as string[]) || []).slice(0, 6).map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                      {(key.scopes as string[])?.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(key.scopes as string[]).length - 6} more
                        </Badge>
                      )}
                    </div>
                    {key.expiresAt && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        Expires {new Date(key.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotateTarget(key)}
                      data-testid={`button-rotate-key-${key.id}`}
                    >
                      <RotateCw className="h-4 w-4 mr-1" />
                      Rotate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => setRevokeTarget(key)}
                      data-testid={`button-revoke-key-${key.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {revokedKeys.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-muted-foreground pt-4" data-testid="text-revoked-heading">
                Revoked Keys
              </h2>
              {revokedKeys.map((key) => (
                <Card
                  key={key.id}
                  className="rounded-[10px] shadow-sm opacity-60"
                  data-testid={`card-revoked-key-${key.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-[17px] font-semibold line-through">{key.name}</h3>
                          <Badge variant="destructive">Revoked</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{key.keyPrefix}...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-create-dialog-title">Create New API Key</DialogTitle>
            <DialogDescription>
              Configure your API key with a name and the permissions it needs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production Integration"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                data-testid="input-key-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-expiration">Expiration (optional)</Label>
              <Input
                id="key-expiration"
                type="date"
                value={keyExpiration}
                onChange={(e) => setKeyExpiration(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                data-testid="input-key-expiration"
              />
            </div>
            <div className="space-y-3">
              <Label>Permissions (Scopes)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCOPE_CATEGORIES.map((cat) => (
                  <Card key={cat.name} className="rounded-[10px]">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-[13px] uppercase tracking-wider text-muted-foreground">
                        {cat.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {cat.scopes.map((scope) => (
                        <label
                          key={scope.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                          data-testid={`checkbox-scope-${scope.id}`}
                        >
                          <Checkbox
                            checked={selectedScopes.includes(scope.id)}
                            onCheckedChange={() => toggleScope(scope.id)}
                          />
                          <span>{scope.label}</span>
                          {scope.critical && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              Critical
                            </Badge>
                          )}
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {selectedScopes.length > 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-selected-count">
                  {selectedScopes.length} scope{selectedScopes.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !keyName.trim() || selectedScopes.length === 0}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showKeyDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowKeyDialog(false);
            setNewKeyPlaintext("");
            setKeyCopied(false);
            setKeyVisible(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-key-created-title">API Key Created</DialogTitle>
            <DialogDescription>
              This is the only time this key will be shown. Copy and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold">Save this key now!</p>
                  <p>You will not be able to see it again after closing this dialog.</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Key Name</Label>
              <p className="text-sm font-medium" data-testid="text-new-key-name">{newKeyName}</p>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono break-all"
                  data-testid="text-new-key-value"
                >
                  {keyVisible ? newKeyPlaintext : "•".repeat(Math.min(newKeyPlaintext.length, 40))}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setKeyVisible(!keyVisible)}
                  data-testid="button-toggle-key-visibility"
                >
                  {keyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleCopyKey}
              className="w-full"
              variant={keyCopied ? "outline" : "default"}
              data-testid="button-copy-key"
            >
              {keyCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-revoke-dialog-title">Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke "{revokeTarget?.name}"? Any applications using this key
              will immediately lose access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
              data-testid="button-confirm-revoke"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rotateTarget} onOpenChange={(open) => !open && setRotateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-rotate-dialog-title">Rotate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new key and revoke "{rotateTarget?.name}". The new key will have the
              same permissions. Applications using the old key will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-rotate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rotateTarget && rotateMutation.mutate(rotateTarget.id)}
              data-testid="button-confirm-rotate"
            >
              Rotate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
