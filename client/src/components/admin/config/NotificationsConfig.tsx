import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Settings, Mail, MessageSquare, Bell, ChevronDown, ChevronRight } from "lucide-react";

interface EmailTemplate {
  subject: string;
  body: string;
}

interface NotificationRule {
  event: string;
  roles: string[];
  channels: string[];
}

const eventLabels: Record<string, string> = {
  quoteCreated: "Quote Created",
  documentSent: "Document Sent",
  stageChanged: "Stage Changed",
  taskCompleted: "Task Completed",
  digestUpdate: "Digest Update",
};

const ruleEventLabels: Record<string, string> = {
  quote_created: "Quote Created",
  document_signed: "Document Signed",
  stage_changed: "Stage Changed",
  task_completed: "Task Completed",
  new_message: "New Message",
  digest_sent: "Digest Sent",
};

const defaults = {
  senderEmail: "",
  senderPhone: "",
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  emailTemplates: {
    quoteCreated: { subject: "New Quote Created", body: "A new quote has been created for {{property_address}}." },
    documentSent: { subject: "Documents Ready for Signature", body: "Documents are ready for your review at {{portal_link}}." },
    stageChanged: { subject: "Loan Status Update", body: "Your loan for {{property_address}} has moved to {{stage_name}}." },
    taskCompleted: { subject: "Task Completed", body: "A task has been completed for {{property_address}}." },
    digestUpdate: { subject: "Loan Progress Update", body: "Here is your latest loan update for {{property_address}}." },
  } as Record<string, EmailTemplate>,
  smsTemplates: {
    quoteCreated: "New quote created for {{property_address}}. Check your dashboard.",
    documentSent: "Documents ready for signing: {{portal_link}}",
    stageChanged: "Loan update: {{property_address}} moved to {{stage_name}}",
    taskCompleted: "Task completed for {{property_address}}",
    digestUpdate: "Loan update for {{property_address}}: {{documents_count}} docs needed",
  } as Record<string, string>,
  notificationRules: [
    { event: "quote_created", roles: ["admin", "staff"], channels: ["email", "in_app"] },
    { event: "document_signed", roles: ["admin", "staff"], channels: ["email", "in_app", "sms"] },
    { event: "stage_changed", roles: ["admin", "staff", "processor"], channels: ["email", "in_app"] },
    { event: "task_completed", roles: ["admin"], channels: ["in_app"] },
    { event: "new_message", roles: ["admin", "staff"], channels: ["in_app"] },
  ] as NotificationRule[],
};

export default function NotificationsConfig() {
  const { config, isLoading, hasChanges, updateConfig, updateField, save, isPending, isSuccess } =
    useTenantConfig("tenant_notifications_config", defaults);
  const { toast } = useToast();
  const [expandedEmail, setExpandedEmail] = useState<Set<string>>(new Set());
  const [expandedSms, setExpandedSms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isSuccess) {
      toast({ title: "Notification settings saved", description: "Your notifications and messaging configuration has been updated." });
    }
  }, [isSuccess]);

  const toggleEmailExpanded = (key: string) => {
    setExpandedEmail(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSmsExpanded = (key: string) => {
    setExpandedSms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const updateEmailTemplate = (key: string, field: keyof EmailTemplate, value: string) => {
    updateConfig({
      emailTemplates: {
        ...config.emailTemplates,
        [key]: { ...config.emailTemplates[key], [field]: value },
      },
    });
  };

  const updateSmsTemplate = (key: string, value: string) => {
    updateConfig({
      smsTemplates: {
        ...config.smsTemplates,
        [key]: value,
      },
    });
  };

  const updateRule = (index: number, field: keyof NotificationRule, value: any) => {
    const updated = [...config.notificationRules];
    updated[index] = { ...updated[index], [field]: value };
    updateField("notificationRules", updated);
  };

  const addRule = () => {
    updateField("notificationRules", [
      ...config.notificationRules,
      { event: "quote_created", roles: ["admin"], channels: ["in_app"] },
    ]);
  };

  const removeRule = (index: number) => {
    updateField("notificationRules", config.notificationRules.filter((_: NotificationRule, i: number) => i !== index));
  };

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

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-notifications-config-title">Notifications & Messaging</CardTitle>
        <CardDescription data-testid="text-notifications-config-description">
          Configure notification channels, email/SMS templates, and notification rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Global Settings</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Sender Email</Label>
              <Input
                id="senderEmail"
                data-testid="input-sender-email"
                type="email"
                value={config.senderEmail}
                onChange={(e) => updateField("senderEmail", e.target.value)}
                placeholder="noreply@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderPhone">Sender Phone</Label>
              <Input
                id="senderPhone"
                data-testid="input-sender-phone"
                type="tel"
                value={config.senderPhone}
                onChange={(e) => updateField("senderPhone", e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="inAppEnabled">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">Show notifications within the application</p>
              </div>
              <Switch
                id="inAppEnabled"
                data-testid="switch-in-app-enabled"
                checked={config.inAppEnabled}
                onCheckedChange={(checked) => updateField("inAppEnabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="emailEnabled">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send notifications via email</p>
              </div>
              <Switch
                id="emailEnabled"
                data-testid="switch-email-enabled"
                checked={config.emailEnabled}
                onCheckedChange={(checked) => updateField("emailEnabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="smsEnabled">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
              </div>
              <Switch
                id="smsEnabled"
                data-testid="switch-sms-enabled"
                checked={config.smsEnabled}
                onCheckedChange={(checked) => updateField("smsEnabled", checked)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Email Templates</h3>
          </div>
          <div className="grid gap-2">
            {Object.entries(config.emailTemplates).map(([key, template]) => {
              const tmpl = template as EmailTemplate;
              const isExpanded = expandedEmail.has(key);
              return (
                <div key={key} className="rounded-md border" data-testid={`card-email-template-${key}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 p-3 text-left flex-wrap"
                    onClick={() => toggleEmailExpanded(key)}
                    data-testid={`button-toggle-email-${key}`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium">{eventLabels[key] || key}</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t p-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`email-subject-${key}`}>Subject</Label>
                        <Input
                          id={`email-subject-${key}`}
                          data-testid={`input-email-subject-${key}`}
                          value={tmpl.subject}
                          onChange={(e) => updateEmailTemplate(key, "subject", e.target.value)}
                          placeholder="Email subject"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`email-body-${key}`}>Body</Label>
                        <Textarea
                          id={`email-body-${key}`}
                          data-testid={`input-email-body-${key}`}
                          value={tmpl.body}
                          onChange={(e) => updateEmailTemplate(key, "body", e.target.value)}
                          placeholder="Email body"
                          rows={4}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">SMS Templates</h3>
          </div>
          <div className="grid gap-2">
            {Object.entries(config.smsTemplates).map(([key, message]) => {
              const isExpanded = expandedSms.has(key);
              return (
                <div key={key} className="rounded-md border" data-testid={`card-sms-template-${key}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 p-3 text-left flex-wrap"
                    onClick={() => toggleSmsExpanded(key)}
                    data-testid={`button-toggle-sms-${key}`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium">{eventLabels[key] || key}</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t p-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`sms-body-${key}`}>Message</Label>
                        <Textarea
                          id={`sms-body-${key}`}
                          data-testid={`input-sms-body-${key}`}
                          value={message as string}
                          onChange={(e) => updateSmsTemplate(key, e.target.value)}
                          placeholder="SMS message"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Notification Rules</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Available events: quote_created, document_signed, stage_changed, task_completed, new_message, digest_sent.
            Roles: admin, super_admin, staff, processor, user.
            Channels: email, sms, in_app.
          </p>
          <div className="grid gap-3">
            {config.notificationRules.map((rule: NotificationRule, index: number) => (
              <div key={index} className="flex items-start gap-2 rounded-md border p-3 flex-wrap">
                <div className="grid flex-1 gap-2 sm:grid-cols-3 min-w-0">
                  <div className="space-y-1">
                    <Label htmlFor={`rule-event-${index}`}>Event</Label>
                    <Input
                      id={`rule-event-${index}`}
                      data-testid={`input-rule-event-${index}`}
                      value={rule.event}
                      onChange={(e) => updateRule(index, "event", e.target.value)}
                      placeholder="e.g. quote_created"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`rule-roles-${index}`}>Roles</Label>
                    <Input
                      id={`rule-roles-${index}`}
                      data-testid={`input-rule-roles-${index}`}
                      value={rule.roles.join(", ")}
                      onChange={(e) => updateRule(index, "roles", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                      placeholder="admin, staff"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`rule-channels-${index}`}>Channels</Label>
                    <Input
                      id={`rule-channels-${index}`}
                      data-testid={`input-rule-channels-${index}`}
                      value={rule.channels.join(", ")}
                      onChange={(e) => updateRule(index, "channels", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                      placeholder="email, in_app"
                    />
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-remove-rule-${index}`}
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            data-testid="button-add-notification-rule"
            onClick={addRule}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </section>

        <Button
          data-testid="button-save-notifications-config"
          onClick={save}
          disabled={!hasChanges || isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
