import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Save, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingDescription: string | null;
  updatedBy: number | null;
  updatedAt: string | null;
}

const settingLabels: Record<string, { label: string; description: string; type: "text" | "textarea" | "url" }> = {
  company_name: {
    label: "Company Name",
    description: "The company name displayed throughout the application",
    type: "text",
  },
  support_email: {
    label: "Support Email",
    description: "Email address for customer support inquiries",
    type: "text",
  },
  puppeteer_quote_url: {
    label: "Quote Scraping URL",
    description: "The URL used for automated quote scraping via Puppeteer",
    type: "url",
  },
};

export default function AdminSettings() {
  const { toast } = useToast();
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ settings: SystemSetting[] }>({
    queryKey: ["/api/admin/settings"],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      return await apiRequest("PUT", `/api/admin/settings/${key}`, { value, description });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: `Setting "${variables.key}" updated successfully` });
      setEditedSettings((prev) => {
        const next = { ...prev };
        delete next[variables.key];
        return next;
      });
    },
    onError: () => {
      toast({ title: "Failed to update setting", variant: "destructive" });
    },
  });

  const handleSave = (key: string) => {
    const currentValue = editedSettings[key];
    if (currentValue !== undefined) {
      const setting = data?.settings.find((s) => s.settingKey === key);
      updateSettingMutation.mutate({
        key,
        value: currentValue,
        description: setting?.settingDescription || undefined,
      });
    }
  };

  const settings = data?.settings || [];

  const getSettingValue = (key: string) => {
    if (editedSettings[key] !== undefined) return editedSettings[key];
    const setting = settings.find((s) => s.settingKey === key);
    return setting?.settingValue || "";
  };

  const hasChanges = (key: string) => {
    const setting = settings.find((s) => s.settingKey === key);
    return editedSettings[key] !== undefined && editedSettings[key] !== setting?.settingValue;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">System Settings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold" data-testid="text-admin-settings-title">System Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Configuration</CardTitle>
          <CardDescription>
            Manage global settings for the loan pricing application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(settingLabels).map(([key, config]) => {
            const setting = settings.find((s) => s.settingKey === key);
            const value = getSettingValue(key);
            const changed = hasChanges(key);

            return (
              <div key={key} className="space-y-2" data-testid={`setting-${key}`}>
                <div className="flex items-center justify-between">
                  <Label htmlFor={key} className="font-medium">
                    {config.label}
                  </Label>
                  {setting?.updatedAt && (
                    <span className="text-xs text-muted-foreground">
                      Updated {format(new Date(setting.updatedAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{config.description}</p>
                <div className="flex gap-2">
                  {config.type === "textarea" ? (
                    <Textarea
                      id={key}
                      value={value}
                      onChange={(e) => setEditedSettings({ ...editedSettings, [key]: e.target.value })}
                      className="flex-1"
                      data-testid={`input-${key}`}
                    />
                  ) : (
                    <Input
                      id={key}
                      type={config.type === "url" ? "url" : "text"}
                      value={value}
                      onChange={(e) => setEditedSettings({ ...editedSettings, [key]: e.target.value })}
                      className="flex-1"
                      data-testid={`input-${key}`}
                    />
                  )}
                  <Button
                    variant={changed ? "default" : "outline"}
                    size="icon"
                    onClick={() => handleSave(key)}
                    disabled={!changed || updateSettingMutation.isPending}
                    data-testid={`button-save-${key}`}
                  >
                    {updateSettingMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Settings</CardTitle>
          <CardDescription>
            View all system settings including auto-generated ones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Key</th>
                  <th className="text-left p-3 text-sm font-medium">Value</th>
                  <th className="text-left p-3 text-sm font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr key={setting.id} className="border-t" data-testid={`row-setting-${setting.settingKey}`}>
                    <td className="p-3 font-mono text-sm">{setting.settingKey}</td>
                    <td className="p-3 text-sm truncate max-w-[200px]">{setting.settingValue}</td>
                    <td className="p-3 text-sm text-muted-foreground">{setting.settingDescription || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
