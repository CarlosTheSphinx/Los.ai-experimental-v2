import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Save, Plus, Trash2, ChevronDown, ChevronRight, FormInput } from "lucide-react";

interface CustomField {
  id: string;
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "select" | "checkbox" | "textarea";
  product: string;
  required: boolean;
  options: string;
  placeholder: string;
  validationMin: string;
  validationMax: string;
  visibleToRoles: string;
  conditionalField: string;
  conditionalValue: string;
}

const defaults = {
  fields: [] as CustomField[],
};

const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Select",
  checkbox: "Checkbox",
  textarea: "Textarea",
};

export default function CustomFieldsConfig() {
  const { config, isLoading, hasChanges, updateField, save, isPending, isSuccess } =
    useTenantConfig("tenant_custom_fields", defaults);
  const { toast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isSuccess) {
      toast({ title: "Custom fields saved", description: "Your custom fields configuration has been updated." });
    }
  }, [isSuccess]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const updateCustomField = (index: number, field: keyof CustomField, value: any) => {
    const updated = [...config.fields];
    updated[index] = { ...updated[index], [field]: value };
    updateField("fields", updated);
  };

  const addField = () => {
    const newId = `field_${Date.now()}`;
    const newField: CustomField = {
      id: newId,
      name: "",
      label: "",
      fieldType: "text",
      product: "all",
      required: false,
      options: "",
      placeholder: "",
      validationMin: "",
      validationMax: "",
      visibleToRoles: "",
      conditionalField: "",
      conditionalValue: "",
    };
    updateField("fields", [...config.fields, newField]);
    setExpandedIds(prev => new Set(prev).add(newId));
  };

  const deleteField = (index: number) => {
    const field = config.fields[index];
    if (!window.confirm(`Delete field "${field.label || field.name || "Untitled"}"? This cannot be undone.`)) return;
    updateField("fields", config.fields.filter((_: CustomField, i: number) => i !== index));
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
        <CardTitle data-testid="text-custom-fields-title">Custom Fields Engine</CardTitle>
        <CardDescription data-testid="text-custom-fields-description">
          Define custom data fields for loan applications across products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.fields.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-no-custom-fields">
            No custom fields defined. Add one below to get started.
          </p>
        )}

        {config.fields.map((field: CustomField, index: number) => {
          const isExpanded = expandedIds.has(field.id);
          return (
            <div key={field.id} className="rounded-md border" data-testid={`card-field-${field.id}`}>
              <div className="flex items-center justify-between gap-2 p-4">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left flex-wrap"
                  onClick={() => toggleExpanded(field.id)}
                  data-testid={`button-toggle-field-${field.id}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <FormInput className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{field.label || field.name || "Untitled Field"}</span>
                  <Badge variant="secondary" className="ml-1">{field.product || "all"}</Badge>
                  <Badge variant="outline" className="ml-1">{fieldTypeLabels[field.fieldType] || field.fieldType}</Badge>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-delete-field-${field.id}`}
                  onClick={() => deleteField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {isExpanded && (
                <div className="border-t p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`field-name-${field.id}`}>Field Name (key)</Label>
                      <Input
                        id={`field-name-${field.id}`}
                        data-testid={`input-field-name-${field.id}`}
                        value={field.name}
                        onChange={(e) => updateCustomField(index, "name", e.target.value)}
                        placeholder="e.g. borrower_experience"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`field-label-${field.id}`}>Display Label</Label>
                      <Input
                        id={`field-label-${field.id}`}
                        data-testid={`input-field-label-${field.id}`}
                        value={field.label}
                        onChange={(e) => updateCustomField(index, "label", e.target.value)}
                        placeholder="e.g. Borrower Experience (years)"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`field-type-${field.id}`}>Field Type</Label>
                      <Select
                        value={field.fieldType}
                        onValueChange={(val) => updateCustomField(index, "fieldType", val)}
                      >
                        <SelectTrigger data-testid={`select-field-type-${field.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`field-product-${field.id}`}>Product</Label>
                      <Input
                        id={`field-product-${field.id}`}
                        data-testid={`input-field-product-${field.id}`}
                        value={field.product}
                        onChange={(e) => updateCustomField(index, "product", e.target.value)}
                        placeholder="all"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor={`field-required-${field.id}`}>Required</Label>
                      <p className="text-sm text-muted-foreground">Make this field mandatory</p>
                    </div>
                    <Switch
                      id={`field-required-${field.id}`}
                      data-testid={`switch-field-required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(checked) => updateCustomField(index, "required", checked)}
                    />
                  </div>
                  {field.fieldType === "select" && (
                    <div className="space-y-2">
                      <Label htmlFor={`field-options-${field.id}`}>Options (comma-separated)</Label>
                      <Textarea
                        id={`field-options-${field.id}`}
                        data-testid={`input-field-options-${field.id}`}
                        value={field.options}
                        onChange={(e) => updateCustomField(index, "options", e.target.value)}
                        placeholder="Option 1, Option 2, Option 3"
                        rows={2}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor={`field-placeholder-${field.id}`}>Placeholder</Label>
                    <Input
                      id={`field-placeholder-${field.id}`}
                      data-testid={`input-field-placeholder-${field.id}`}
                      value={field.placeholder}
                      onChange={(e) => updateCustomField(index, "placeholder", e.target.value)}
                      placeholder="Placeholder text..."
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`field-min-${field.id}`}>Validation Min</Label>
                      <Input
                        id={`field-min-${field.id}`}
                        data-testid={`input-field-validation-min-${field.id}`}
                        value={field.validationMin}
                        onChange={(e) => updateCustomField(index, "validationMin", e.target.value)}
                        placeholder="Min value or length"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`field-max-${field.id}`}>Validation Max</Label>
                      <Input
                        id={`field-max-${field.id}`}
                        data-testid={`input-field-validation-max-${field.id}`}
                        value={field.validationMax}
                        onChange={(e) => updateCustomField(index, "validationMax", e.target.value)}
                        placeholder="Max value or length"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`field-roles-${field.id}`}>Visible to Roles (comma-separated)</Label>
                    <Input
                      id={`field-roles-${field.id}`}
                      data-testid={`input-field-visible-roles-${field.id}`}
                      value={field.visibleToRoles}
                      onChange={(e) => updateCustomField(index, "visibleToRoles", e.target.value)}
                      placeholder="admin, underwriter, processor"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`field-cond-field-${field.id}`}>Conditional Field</Label>
                      <Input
                        id={`field-cond-field-${field.id}`}
                        data-testid={`input-field-conditional-field-${field.id}`}
                        value={field.conditionalField}
                        onChange={(e) => updateCustomField(index, "conditionalField", e.target.value)}
                        placeholder="Field name that controls visibility"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`field-cond-value-${field.id}`}>Conditional Value</Label>
                      <Input
                        id={`field-cond-value-${field.id}`}
                        data-testid={`input-field-conditional-value-${field.id}`}
                        value={field.conditionalValue}
                        onChange={(e) => updateCustomField(index, "conditionalValue", e.target.value)}
                        placeholder="Value that triggers visibility"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <Button
          variant="outline"
          data-testid="button-add-custom-field"
          onClick={addField}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Field
        </Button>

        <Button
          data-testid="button-save-custom-fields"
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
