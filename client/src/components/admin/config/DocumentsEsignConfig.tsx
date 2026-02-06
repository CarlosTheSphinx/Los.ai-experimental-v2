import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { Save, Plus, Trash2, FileSignature, Variable, Users, Mail, Webhook } from "lucide-react";

interface TemplateVariable {
  key: string;
  description: string;
}

interface SigningRole {
  name: string;
  order: number;
}

const defaults = {
  esignProvider: "pandadoc",
  esignApiConfigured: false,
  templateVariables: [
    { key: "borrower_name", description: "Full borrower name" },
    { key: "borrower_email", description: "Borrower email address" },
    { key: "loan_amount", description: "Formatted loan amount" },
    { key: "interest_rate", description: "Interest rate percentage" },
    { key: "property_address", description: "Property address" },
    { key: "property_type", description: "Property type" },
    { key: "today_date", description: "Current date" },
  ] as TemplateVariable[],
  signingRoles: [
    { name: "Borrower", order: 1 },
    { name: "Co-Borrower", order: 2 },
    { name: "Guarantor", order: 3 },
  ] as SigningRole[],
  sendEmailSubject: "Documents Ready for Signature - {{property_address}}",
  sendEmailBody: "Dear {{borrower_name}},\n\nPlease review and sign the attached documents for your loan at {{property_address}}.\n\nBest regards,\n{{company_name}}",
  webhookUrl: "",
  autoRemindDays: 3,
  expirationDays: 30,
};

const providerLabels: Record<string, string> = {
  pandadoc: "PandaDoc",
  docusign: "DocuSign",
  adobe_sign: "Adobe Sign",
  internal: "Internal",
};

export default function DocumentsEsignConfig() {
  const { config, isLoading, hasChanges, updateField, save, isPending, isSuccess } =
    useTenantConfig("tenant_documents_config", defaults);
  const { toast } = useToast();

  useEffect(() => {
    if (isSuccess) {
      toast({ title: "Document settings saved", description: "Your documents and e-signature configuration has been updated." });
    }
  }, [isSuccess]);

  const updateTemplateVar = (index: number, field: keyof TemplateVariable, value: string) => {
    const updated = [...config.templateVariables];
    updated[index] = { ...updated[index], [field]: value };
    updateField("templateVariables", updated);
  };

  const addTemplateVar = () => {
    updateField("templateVariables", [...config.templateVariables, { key: "", description: "" }]);
  };

  const removeTemplateVar = (index: number) => {
    updateField("templateVariables", config.templateVariables.filter((_: TemplateVariable, i: number) => i !== index));
  };

  const updateSigningRole = (index: number, field: keyof SigningRole, value: string | number) => {
    const updated = [...config.signingRoles];
    updated[index] = { ...updated[index], [field]: value };
    updateField("signingRoles", updated);
  };

  const addSigningRole = () => {
    const nextOrder = config.signingRoles.length > 0
      ? Math.max(...config.signingRoles.map((r: SigningRole) => r.order)) + 1
      : 1;
    updateField("signingRoles", [...config.signingRoles, { name: "", order: nextOrder }]);
  };

  const removeSigningRole = (index: number) => {
    updateField("signingRoles", config.signingRoles.filter((_: SigningRole, i: number) => i !== index));
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
        <CardTitle data-testid="text-documents-esign-title">Documents & E-Signature</CardTitle>
        <CardDescription data-testid="text-documents-esign-description">
          Configure e-signature providers, template variables, signing roles, and email templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">E-Sign Provider</h3>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-48">
              <Select
                value={config.esignProvider}
                onValueChange={(val) => updateField("esignProvider", val)}
              >
                <SelectTrigger data-testid="select-esign-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pandadoc">PandaDoc</SelectItem>
                  <SelectItem value="docusign">DocuSign</SelectItem>
                  <SelectItem value="adobe_sign">Adobe Sign</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge
              variant={config.esignApiConfigured ? "default" : "secondary"}
              data-testid="badge-esign-status"
            >
              {config.esignApiConfigured ? "API Configured" : "Not Configured"}
            </Badge>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Variable className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Template Variables</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {"These variables can be used in document templates with {{variable_name}} syntax."}
          </p>
          <div className="grid gap-2">
            {config.templateVariables.map((variable: TemplateVariable, index: number) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <Input
                  data-testid={`input-template-var-key-${index}`}
                  value={variable.key}
                  onChange={(e) => updateTemplateVar(index, "key", e.target.value)}
                  placeholder="Variable key"
                  className="flex-1 min-w-[120px]"
                />
                <Input
                  data-testid={`input-template-var-desc-${index}`}
                  value={variable.description}
                  onChange={(e) => updateTemplateVar(index, "description", e.target.value)}
                  placeholder="Description"
                  className="flex-1 min-w-[120px]"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-remove-template-var-${index}`}
                  onClick={() => removeTemplateVar(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            data-testid="button-add-template-var"
            onClick={addTemplateVar}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Variable
          </Button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Signing Roles</h3>
          </div>
          <div className="grid gap-2">
            {config.signingRoles.map((role: SigningRole, index: number) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <Input
                  data-testid={`input-signing-role-name-${index}`}
                  value={role.name}
                  onChange={(e) => updateSigningRole(index, "name", e.target.value)}
                  placeholder="Role name"
                  className="flex-1 min-w-[120px]"
                />
                <Input
                  data-testid={`input-signing-role-order-${index}`}
                  type="number"
                  min={1}
                  value={role.order}
                  onChange={(e) => updateSigningRole(index, "order", parseInt(e.target.value) || 1)}
                  placeholder="Order"
                  className="w-24"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-remove-signing-role-${index}`}
                  onClick={() => removeSigningRole(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            data-testid="button-add-signing-role"
            onClick={addSigningRole}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Email Templates</h3>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="sendEmailSubject">Email Subject</Label>
              <Input
                id="sendEmailSubject"
                data-testid="input-send-email-subject"
                value={config.sendEmailSubject}
                onChange={(e) => updateField("sendEmailSubject", e.target.value)}
                placeholder="Documents Ready for Signature - {{property_address}}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendEmailBody">Email Body</Label>
              <Textarea
                id="sendEmailBody"
                data-testid="input-send-email-body"
                value={config.sendEmailBody}
                onChange={(e) => updateField("sendEmailBody", e.target.value)}
                placeholder="Email body content..."
                rows={6}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {"Available variables: {{borrower_name}}, {{borrower_email}}, {{property_address}}, {{company_name}}, {{loan_amount}}"}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Webhook & Automation</h3>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                data-testid="input-webhook-url"
                type="url"
                value={config.webhookUrl}
                onChange={(e) => updateField("webhookUrl", e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="autoRemindDays">Auto-Remind (days)</Label>
                <Input
                  id="autoRemindDays"
                  data-testid="input-auto-remind-days"
                  type="number"
                  min={1}
                  value={config.autoRemindDays}
                  onChange={(e) => updateField("autoRemindDays", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expirationDays">Expiration (days)</Label>
                <Input
                  id="expirationDays"
                  data-testid="input-expiration-days"
                  type="number"
                  min={1}
                  value={config.expirationDays}
                  onChange={(e) => updateField("expirationDays", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>
        </section>

        <Button
          data-testid="button-save-documents-config"
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
