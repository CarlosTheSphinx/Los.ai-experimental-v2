import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  Save, MessageSquare, Bell, FileUp, FileCheck, ClipboardList,
  AtSign, Mail, Paperclip, GitBranch, Brain, CheckCircle2, XCircle,
  FileText, type LucideIcon
} from "lucide-react";

interface NotificationTypeConfig {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
}

const notificationGroups: { title: string; items: NotificationTypeConfig[] }[] = [
  {
    title: "Messaging",
    items: [
      {
        key: "new_message",
        label: "New Message",
        description: "When a new message is received between borrower and lender",
        icon: MessageSquare,
        iconColor: "text-green-500",
      },
      {
        key: "mention_in_note",
        label: "Mention in Note",
        description: "When a user is @mentioned in a deal note",
        icon: AtSign,
        iconColor: "text-purple-500",
      },
    ],
  },
  {
    title: "Tasks",
    items: [
      {
        key: "task_assigned",
        label: "Task Assigned",
        description: "When a task is assigned or reassigned to a user",
        icon: ClipboardList,
        iconColor: "text-orange-500",
      },
    ],
  },
  {
    title: "Pipeline",
    items: [
      {
        key: "stage_change",
        label: "Stage Change",
        description: "When a deal moves to a new pipeline stage",
        icon: GitBranch,
        iconColor: "text-blue-500",
      },
    ],
  },
  {
    title: "Documents",
    items: [
      {
        key: "document_uploaded",
        label: "Document Uploaded",
        description: "When a borrower or broker uploads a document",
        icon: FileUp,
        iconColor: "text-blue-500",
      },
      {
        key: "document_approved",
        label: "Document Approved",
        description: "When a document is approved",
        icon: CheckCircle2,
        iconColor: "text-emerald-500",
      },
      {
        key: "document_rejected",
        label: "Document Rejected",
        description: "When a document is rejected",
        icon: XCircle,
        iconColor: "text-red-500",
      },
    ],
  },
  {
    title: "E-Signatures",
    items: [
      {
        key: "term_sheet_signed",
        label: "Term Sheet Signed",
        description: "When a PandaDoc agreement is completed/signed",
        icon: FileCheck,
        iconColor: "text-emerald-500",
      },
    ],
  },
  {
    title: "Email Integration",
    items: [
      {
        key: "new_email",
        label: "New Email",
        description: "When a new email arrives on a linked deal via Gmail/Outlook",
        icon: Mail,
        iconColor: "text-indigo-500",
      },
      {
        key: "email_document_detected",
        label: "Email Document Detected",
        description: "When AI detects a document in an email attachment",
        icon: Paperclip,
        iconColor: "text-amber-500",
      },
    ],
  },
  {
    title: "AI Review",
    items: [
      {
        key: "doc_review_failed",
        label: "AI Review Failed",
        description: "When AI document review finds issues with a document",
        icon: XCircle,
        iconColor: "text-red-500",
      },
      {
        key: "doc_review_passed",
        label: "AI Review Passed",
        description: "When AI document review passes a document",
        icon: CheckCircle2,
        iconColor: "text-emerald-500",
      },
      {
        key: "draft_ready",
        label: "Draft Communication Ready",
        description: "When AI generates a draft communication for review",
        icon: FileText,
        iconColor: "text-blue-500",
      },
    ],
  },
];

const allKeys = notificationGroups.flatMap(g => g.items.map(i => i.key));

const defaultPrefs: Record<string, boolean> = {};
allKeys.forEach(k => { defaultPrefs[k] = true; });

export default function NotificationsConfig() {
  const { config, isLoading, hasChanges, updateConfig, save, isPending, isSuccess } =
    useTenantConfig("notification_preferences", defaultPrefs);
  const { toast } = useToast();

  useEffect(() => {
    if (isSuccess) {
      toast({ title: "Notification preferences saved", description: "Your notification toggles have been updated." });
    }
  }, [isSuccess]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  const enabledCount = allKeys.filter(k => config[k] !== false).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle data-testid="text-notifications-config-title">Notification Preferences</CardTitle>
            <CardDescription data-testid="text-notifications-config-description">
              Control which actions trigger in-app notifications. Toggle each notification type on or off.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs" data-testid="badge-notification-count">
            {enabledCount} of {allKeys.length} enabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground" data-testid={`heading-group-${group.title.toLowerCase().replace(/\s+/g, '-')}`}>
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isEnabled = config[item.key] !== false;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/50 px-4 py-3"
                    data-testid={`row-notification-${item.key}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 ${item.iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-[14px] font-medium cursor-pointer" htmlFor={`switch-${item.key}`}>
                          {item.label}
                        </Label>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={`switch-${item.key}`}
                      data-testid={`switch-notification-${item.key}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => updateConfig({ ...config, [item.key]: checked })}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <Button
            data-testid="button-save-notification-preferences"
            onClick={save}
            disabled={!hasChanges || isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          {hasChanges && (
            <span className="text-[12px] text-muted-foreground">You have unsaved changes</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
