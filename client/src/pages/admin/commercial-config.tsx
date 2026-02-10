import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Plus,
  Trash2,
  Pencil,
  ClipboardEdit,
  ShieldCheck,
  FileText,
  Brain,
  Bell,
  ListChecks,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Criterion {
  id: number;
  criteriaType: string;
  criteriaValue: string;
  criteriaLabel: string | null;
  isActive: boolean;
}

interface CustomField {
  id: number;
  fieldLabel: string;
  fieldType: string;
  fieldOptions: string | null;
  isRequired: boolean;
  appliesToDealTypes: string;
  fieldOrder: number;
  isActive: boolean;
}

interface DocRequirement {
  id: number;
  documentName: string;
  documentCategory: string | null;
  dealType: string;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
}

interface ReviewRule {
  id: number;
  ruleCategory: string;
  ruleDescription: string;
  rulePriority: number;
  isActive: boolean;
}

interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingDescription: string | null;
}

const CONFIG_TABS = [
  { id: "pre-screener", label: "Pre-Screener", icon: ShieldCheck },
  { id: "custom-fields", label: "Custom Fields", icon: ListChecks },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "ai-rules", label: "AI Rules", icon: Brain },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const ASSET_CLASSES = [
  "Multifamily (5+ units)",
  "Office",
  "Retail",
  "Industrial/Warehouse",
  "Self-Storage",
  "Mixed-Use",
  "Hospitality (Hotels)",
  "Senior Living",
  "Gas Stations",
  "Churches",
  "Special Purpose",
  "Land/Development",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const CREDIT_SCORE_RANGES = [
  { value: "580", label: "580+" },
  { value: "620", label: "620+" },
  { value: "640", label: "640+" },
  { value: "660", label: "660+" },
  { value: "680", label: "680+" },
  { value: "700", label: "700+" },
  { value: "720", label: "720+" },
  { value: "740", label: "740+" },
];

const NOTIFICATION_KEYS = [
  { key: "commercial_notify_broker_submitted", label: "Email broker on submission" },
  { key: "commercial_notify_broker_approved", label: "Email broker on approval" },
  { key: "commercial_notify_broker_declined", label: "Email broker on decline" },
  { key: "commercial_notify_broker_docs_needed", label: "Email broker on docs needed" },
  { key: "commercial_notify_admin_new_submission", label: "Email admin on new submission" },
  { key: "commercial_notify_admin_approved", label: "Email admin on approval" },
  { key: "commercial_notify_admin_manual_review", label: "Email admin on manual review needed" },
];

const DEAL_TYPE_FILTERS = [
  { value: "all", label: "All Deal Types" },
  { value: "acquisition", label: "Acquisition" },
  { value: "refinance", label: "Refinance" },
  { value: "construction", label: "Construction" },
];

function PreScreenerTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<Criterion[]>({
    queryKey: ["/api/admin/commercial/criteria"],
  });

  const [localCriteria, setLocalCriteria] = useState<Record<string, { value: string; isActive: boolean; id?: number }>>({});

  useEffect(() => {
    if (data) {
      const map: Record<string, { value: string; isActive: boolean; id?: number }> = {};
      for (const c of data) {
        map[c.criteriaType] = { value: c.criteriaValue, isActive: c.isActive, id: c.id };
      }
      setLocalCriteria(map);
    }
  }, [data]);

  const getLocalValue = (type: string, fallback: string = "") => {
    return localCriteria[type]?.value ?? fallback;
  };

  const getLocalActive = (type: string) => {
    return localCriteria[type]?.isActive ?? true;
  };

  const setLocalValue = (type: string, value: string) => {
    setLocalCriteria(prev => ({
      ...prev,
      [type]: { ...prev[type], value, isActive: prev[type]?.isActive ?? true },
    }));
  };

  const setLocalActive = (type: string, isActive: boolean) => {
    setLocalCriteria(prev => ({
      ...prev,
      [type]: { ...prev[type], value: prev[type]?.value ?? "", isActive },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(localCriteria);
      for (const [criteriaType, { value, isActive, id }] of entries) {
        if (id) {
          await apiRequest("PATCH", `/api/admin/commercial/criteria/${id}`, {
            criteriaValue: value,
            isActive,
          });
        } else {
          await apiRequest("POST", "/api/admin/commercial/criteria", {
            criteriaType,
            criteriaValue: value,
            criteriaLabel: criteriaType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            isActive,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/criteria"] });
      toast({ title: "Pre-screener criteria saved" });
    },
    onError: () => {
      toast({ title: "Failed to save criteria", variant: "destructive" });
    },
  });

  const toggleCheckbox = (type: string, item: string) => {
    const current = getLocalValue(type, "[]");
    let arr: string[] = [];
    try { arr = JSON.parse(current); } catch { arr = []; }
    if (arr.includes(item)) {
      arr = arr.filter(i => i !== item);
    } else {
      arr.push(item);
    }
    setLocalValue(type, JSON.stringify(arr));
  };

  const isChecked = (type: string, item: string) => {
    const current = getLocalValue(type, "[]");
    try {
      return JSON.parse(current).includes(item);
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loan Size</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Loan Size</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={getLocalValue("min_loan_size", "0")}
                  onChange={(e) => setLocalValue("min_loan_size", e.target.value)}
                  data-testid="input-min-loan-size"
                />
                <Switch
                  checked={getLocalActive("min_loan_size")}
                  onCheckedChange={(v) => setLocalActive("min_loan_size", v)}
                  data-testid="switch-min-loan-size"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Maximum Loan Size</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={getLocalValue("max_loan_size", "0")}
                  onChange={(e) => setLocalValue("max_loan_size", e.target.value)}
                  data-testid="input-max-loan-size"
                />
                <Switch
                  checked={getLocalActive("max_loan_size")}
                  onCheckedChange={(v) => setLocalActive("max_loan_size", v)}
                  data-testid="switch-max-loan-size"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approved Asset Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Switch
              checked={getLocalActive("approved_asset_classes")}
              onCheckedChange={(v) => setLocalActive("approved_asset_classes", v)}
              data-testid="switch-approved-asset-classes"
            />
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ASSET_CLASSES.map(ac => (
              <label key={ac} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={isChecked("approved_asset_classes", ac)}
                  onCheckedChange={() => toggleCheckbox("approved_asset_classes", ac)}
                  data-testid={`checkbox-asset-${ac.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                />
                {ac}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approved States</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Switch
              checked={getLocalActive("approved_states")}
              onCheckedChange={(v) => setLocalActive("approved_states", v)}
              data-testid="switch-approved-states"
            />
            <span className="text-sm text-muted-foreground">Active</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalValue("approved_states", JSON.stringify(US_STATES))}
              data-testid="button-select-all-states"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalValue("approved_states", "[]")}
              data-testid="button-deselect-all-states"
            >
              Deselect All
            </Button>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {US_STATES.map(st => (
              <label key={st} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox
                  checked={isChecked("approved_states", st)}
                  onCheckedChange={() => toggleCheckbox("approved_states", st)}
                  data-testid={`checkbox-state-${st}`}
                />
                {st}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Minimum Credit Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select
              value={getLocalValue("min_credit_score", "620")}
              onValueChange={(v) => setLocalValue("min_credit_score", v)}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-min-credit-score">
                <SelectValue placeholder="Select score" />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_SCORE_RANGES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Switch
              checked={getLocalActive("min_credit_score")}
              onCheckedChange={(v) => setLocalActive("min_credit_score", v)}
              data-testid="switch-min-credit-score"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        data-testid="button-save-criteria"
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : "Save Criteria"}
      </Button>
    </div>
  );
}

function CustomFieldsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [form, setForm] = useState({
    fieldLabel: "",
    fieldType: "text",
    fieldOptions: "",
    isRequired: false,
    appliesToDealTypes: "all",
    fieldOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery<CustomField[]>({
    queryKey: ["/api/admin/commercial/fields"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await apiRequest("POST", "/api/admin/commercial/fields", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/fields"] });
      toast({ title: "Field created" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create field", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: typeof form & { id: number }) => {
      return await apiRequest("PATCH", `/api/admin/commercial/fields/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/fields"] });
      toast({ title: "Field updated" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update field", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/commercial/fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/fields"] });
      toast({ title: "Field deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete field", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/commercial/fields/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/fields"] });
    },
    onError: () => {
      toast({ title: "Failed to toggle field", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingField(null);
    setForm({ fieldLabel: "", fieldType: "text", fieldOptions: "", isRequired: false, appliesToDealTypes: "all", fieldOrder: 0, isActive: true });
  };

  const openEdit = (field: CustomField) => {
    setEditingField(field);
    setForm({
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      fieldOptions: field.fieldOptions || "",
      isRequired: field.isRequired,
      appliesToDealTypes: field.appliesToDealTypes,
      fieldOrder: field.fieldOrder,
      isActive: field.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.fieldLabel.trim()) {
      toast({ title: "Field label is required", variant: "destructive" });
      return;
    }
    if (editingField) {
      updateMutation.mutate({ id: editingField.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this field?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-medium" data-testid="text-custom-fields-title">Intake Form Fields</h3>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-field">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {(!data || data.length === 0) ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No custom fields configured yet. Click "Add Field" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map(field => (
            <Card key={field.id}>
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" data-testid={`text-field-label-${field.id}`}>{field.fieldLabel}</span>
                    <Badge variant="secondary" className="text-xs">{field.fieldType}</Badge>
                    {field.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Order: {field.fieldOrder} | Applies to: {field.appliesToDealTypes}
                  </div>
                </div>
                <Switch
                  checked={field.isActive}
                  onCheckedChange={(v) => toggleActiveMutation.mutate({ id: field.id, isActive: v })}
                  data-testid={`switch-field-active-${field.id}`}
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(field)} data-testid={`button-edit-field-${field.id}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(field.id)} data-testid={`button-delete-field-${field.id}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Field Label</Label>
              <Input
                value={form.fieldLabel}
                onChange={(e) => setForm(f => ({ ...f, fieldLabel: e.target.value }))}
                data-testid="input-field-label"
              />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select value={form.fieldType} onValueChange={(v) => setForm(f => ({ ...f, fieldType: v }))}>
                <SelectTrigger data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.fieldType === "dropdown" && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input
                  value={form.fieldOptions}
                  onChange={(e) => setForm(f => ({ ...f, fieldOptions: e.target.value }))}
                  placeholder="Option 1, Option 2, Option 3"
                  data-testid="input-field-options"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={form.appliesToDealTypes} onValueChange={(v) => setForm(f => ({ ...f, appliesToDealTypes: v }))}>
                <SelectTrigger data-testid="select-applies-to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deal Types</SelectItem>
                  <SelectItem value="acquisition">Acquisition</SelectItem>
                  <SelectItem value="refinance">Refinance</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Field Order</Label>
              <Input
                type="number"
                value={form.fieldOrder}
                onChange={(e) => setForm(f => ({ ...f, fieldOrder: parseInt(e.target.value) || 0 }))}
                data-testid="input-field-order"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.isRequired}
                onCheckedChange={(v) => setForm(f => ({ ...f, isRequired: v === true }))}
                data-testid="checkbox-field-required"
              />
              <Label>Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
                data-testid="switch-field-active-dialog"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-field">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-field"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentsTab() {
  const { toast } = useToast();
  const [dealTypeFilter, setDealTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocRequirement | null>(null);
  const [form, setForm] = useState({
    documentName: "",
    documentCategory: "",
    dealType: "all",
    isRequired: true,
    displayOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery<DocRequirement[]>({
    queryKey: ["/api/admin/commercial/document-requirements", dealTypeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/commercial/document-requirements?dealType=${dealTypeFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      return await apiRequest("POST", "/api/admin/commercial/document-requirements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/document-requirements"] });
      toast({ title: "Document requirement created" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create requirement", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: typeof form & { id: number }) => {
      return await apiRequest("PATCH", `/api/admin/commercial/document-requirements/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/document-requirements"] });
      toast({ title: "Document requirement updated" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update requirement", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/commercial/document-requirements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/document-requirements"] });
      toast({ title: "Document requirement deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete requirement", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDoc(null);
    setForm({ documentName: "", documentCategory: "", dealType: "all", isRequired: true, displayOrder: 0, isActive: true });
  };

  const openEdit = (doc: DocRequirement) => {
    setEditingDoc(doc);
    setForm({
      documentName: doc.documentName,
      documentCategory: doc.documentCategory || "",
      dealType: doc.dealType,
      isRequired: doc.isRequired,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.documentName.trim()) {
      toast({ title: "Document name is required", variant: "destructive" });
      return;
    }
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this requirement?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {DEAL_TYPE_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={dealTypeFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDealTypeFilter(f.value)}
              data-testid={`button-filter-${f.value}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-doc-requirement">
          <Plus className="h-4 w-4 mr-2" />
          Add Requirement
        </Button>
      </div>

      {(!data || data.length === 0) ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No document requirements for this deal type.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map(doc => (
            <Card key={doc.id}>
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" data-testid={`text-doc-name-${doc.id}`}>{doc.documentName}</span>
                    {doc.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                    {!doc.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Category: {doc.documentCategory || "General"} | Type: {doc.dealType} | Order: {doc.displayOrder}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} data-testid={`button-edit-doc-${doc.id}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} data-testid={`button-delete-doc-${doc.id}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={form.documentName}
                onChange={(e) => setForm(f => ({ ...f, documentName: e.target.value }))}
                data-testid="input-doc-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.documentCategory}
                onChange={(e) => setForm(f => ({ ...f, documentCategory: e.target.value }))}
                placeholder="e.g., Financial, Legal, Property"
                data-testid="input-doc-category"
              />
            </div>
            <div className="space-y-2">
              <Label>Deal Type</Label>
              <Select value={form.dealType} onValueChange={(v) => setForm(f => ({ ...f, dealType: v }))}>
                <SelectTrigger data-testid="select-doc-deal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_TYPE_FILTERS.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                data-testid="input-doc-order"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.isRequired}
                onCheckedChange={(v) => setForm(f => ({ ...f, isRequired: v === true }))}
                data-testid="checkbox-doc-required"
              />
              <Label>Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
                data-testid="switch-doc-active"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-doc">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-doc"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AIRulesTab() {
  const { toast } = useToast();
  const categories = [
    { key: "auto_decline", label: "Auto Decline Rules", description: "Rules that automatically decline submissions" },
    { key: "request_more_info", label: "Request More Info Rules", description: "Rules that trigger additional information requests" },
    { key: "auto_approve", label: "Auto Approve Rules", description: "Rules that automatically approve submissions" },
  ];

  return (
    <div className="space-y-6">
      {categories.map(cat => (
        <AIRuleCategoryCard key={cat.key} category={cat.key} label={cat.label} description={cat.description} />
      ))}
    </div>
  );
}

function AIRuleCategoryCard({ category, label, description }: { category: string; label: string; description: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ruleDescription: "", rulePriority: 0 });

  const { data, isLoading } = useQuery<ReviewRule[]>({
    queryKey: ["/api/admin/commercial/review-rules", category],
    queryFn: async () => {
      const res = await fetch(`/api/admin/commercial/review-rules?category=${category}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { ruleCategory: string; ruleDescription: string; rulePriority: number }) => {
      return await apiRequest("POST", "/api/admin/commercial/review-rules", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/review-rules"] });
      toast({ title: "Rule created" });
      setDialogOpen(false);
      setForm({ ruleDescription: "", rulePriority: 0 });
    },
    onError: () => {
      toast({ title: "Failed to create rule", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/commercial/review-rules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/review-rules"] });
    },
    onError: () => {
      toast({ title: "Failed to toggle rule", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/commercial/review-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commercial/review-rules"] });
      toast({ title: "Rule deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!form.ruleDescription.trim()) {
      toast({ title: "Rule description is required", variant: "destructive" });
      return;
    }
    createMutation.mutate({ ruleCategory: category, ruleDescription: form.ruleDescription, rulePriority: form.rulePriority });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg" data-testid={`text-rule-category-${category}`}>{label}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} data-testid={`button-add-rule-${category}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">No rules configured for this category.</p>
        ) : (
          <div className="space-y-2">
            {data.map(rule => (
              <div key={rule.id} className="flex items-center gap-3 p-3 border rounded-md" data-testid={`rule-row-${rule.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" data-testid={`text-rule-desc-${rule.id}`}>{rule.ruleDescription}</p>
                  <span className="text-xs text-muted-foreground">Priority: {rule.rulePriority}</span>
                </div>
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, isActive: v })}
                  data-testid={`switch-rule-active-${rule.id}`}
                />
                <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} data-testid={`button-delete-rule-${rule.id}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {label.replace(" Rules", "")} Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Description</Label>
              <Input
                value={form.ruleDescription}
                onChange={(e) => setForm(f => ({ ...f, ruleDescription: e.target.value }))}
                placeholder="Describe the rule..."
                data-testid={`input-rule-desc-${category}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                value={form.rulePriority}
                onChange={(e) => setForm(f => ({ ...f, rulePriority: parseInt(e.target.value) || 0 }))}
                data-testid={`input-rule-priority-${category}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid={`button-cancel-rule-${category}`}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid={`button-save-rule-${category}`}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ settings: SystemSetting[] }>({
    queryKey: ["/api/admin/settings"],
  });

  const [localSettings, setLocalSettings] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      const map: Record<string, boolean> = {};
      for (const nk of NOTIFICATION_KEYS) {
        const setting = data.settings.find(s => s.settingKey === nk.key);
        map[nk.key] = setting?.settingValue === "true";
      }
      setLocalSettings(map);
      setHasChanges(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(localSettings)) {
        await apiRequest("PUT", `/api/admin/settings/${key}`, {
          value: value ? "true" : "false",
          description: NOTIFICATION_KEYS.find(nk => nk.key === key)?.label || key,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Notification preferences saved" });
      setHasChanges(false);
    },
    onError: () => {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    },
  });

  const toggle = (key: string, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 mb-2">
            <h4 className="font-medium text-sm">Broker Notifications</h4>
          </div>
          {NOTIFICATION_KEYS.filter(nk => nk.key.includes("broker")).map(nk => (
            <div key={nk.key} className="flex items-center justify-between gap-4" data-testid={`notification-row-${nk.key}`}>
              <Label className="text-sm font-normal">{nk.label}</Label>
              <Switch
                checked={localSettings[nk.key] ?? false}
                onCheckedChange={(v) => toggle(nk.key, v)}
                data-testid={`switch-notify-${nk.key}`}
              />
            </div>
          ))}

          <div className="border-t pt-4 mt-4 space-y-1 mb-2">
            <h4 className="font-medium text-sm">Admin Notifications</h4>
          </div>
          {NOTIFICATION_KEYS.filter(nk => nk.key.includes("admin")).map(nk => (
            <div key={nk.key} className="flex items-center justify-between gap-4" data-testid={`notification-row-${nk.key}`}>
              <Label className="text-sm font-normal">{nk.label}</Label>
              <Switch
                checked={localSettings[nk.key] ?? false}
                onCheckedChange={(v) => toggle(nk.key, v)}
                data-testid={`switch-notify-${nk.key}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !hasChanges}
        data-testid="button-save-notifications"
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}

export default function AdminCommercialConfig() {
  const [activeTab, setActiveTab] = useState("pre-screener");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardEdit className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Commercial Submission Configuration</h1>
      </div>

      <div className="flex gap-6">
        <nav className="w-52 shrink-0 space-y-1 sticky top-4 self-start" data-testid="nav-commercial-config-tabs">
          {CONFIG_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                activeTab === tab.id
                  ? "bg-muted font-medium"
                  : "text-muted-foreground hover-elevate"
              )}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "pre-screener" && <PreScreenerTab />}
          {activeTab === "custom-fields" && <CustomFieldsTab />}
          {activeTab === "documents" && <DocumentsTab />}
          {activeTab === "ai-rules" && <AIRulesTab />}
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}
