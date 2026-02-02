import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Users,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Partner {
  id: number;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  entityType: string | null;
  experienceLevel: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  loansInProcess: number;
  allTimeLoans: number;
}

interface PartnersResponse {
  partners: Partner[];
}

function getExperienceBadgeVariant(level: string | null): "default" | "secondary" | "outline" {
  switch (level) {
    case "experienced":
      return "default";
    case "intermediate":
      return "secondary";
    case "beginner":
    default:
      return "outline";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getEntityIcon(entityType: string | null) {
  switch (entityType?.toLowerCase()) {
    case "llc":
    case "corporation":
    case "partnership":
      return <Building2 className="h-4 w-4 mr-1.5" />;
    case "individual":
      return <Users className="h-4 w-4 mr-1.5" />;
    default:
      return <Building2 className="h-4 w-4 mr-1.5" />;
  }
}

export default function AdminPartners() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [newPartner, setNewPartner] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    entityType: "",
    experienceLevel: "beginner",
    notes: "",
  });

  const { data, isLoading } = useQuery<PartnersResponse>({
    queryKey: ["/api/admin/partners", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      const res = await fetch(`/api/admin/partners?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch partners");
      return res.json();
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (partnerData: typeof newPartner) => {
      return apiRequest("POST", "/api/admin/partners", partnerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setIsAddDialogOpen(false);
      setNewPartner({
        name: "",
        companyName: "",
        email: "",
        phone: "",
        entityType: "",
        experienceLevel: "beginner",
        notes: "",
      });
      toast({
        title: "Partner added",
        description: "The partner has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add partner. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePartner = () => {
    if (!newPartner.name) {
      toast({
        title: "Missing fields",
        description: "Please enter a partner name.",
        variant: "destructive",
      });
      return;
    }
    createPartnerMutation.mutate(newPartner);
  };

  const partners = data?.partners || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Partners</h1>
          <p className="text-muted-foreground">Manage your partner relationships</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-partner">
              <Plus className="h-4 w-4 mr-2" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Partner</DialogTitle>
              <DialogDescription>
                Add a new referral partner to your network
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partnerName">Name *</Label>
                  <Input
                    id="partnerName"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    placeholder="John Smith"
                    data-testid="input-partner-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company</Label>
                  <Input
                    id="companyName"
                    value={newPartner.companyName}
                    onChange={(e) => setNewPartner({ ...newPartner, companyName: e.target.value })}
                    placeholder="Smith Investments LLC"
                    data-testid="input-company-name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                    placeholder="john@example.com"
                    data-testid="input-partner-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    placeholder="(310) 555-1234"
                    data-testid="input-partner-phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entityType">Entity Type</Label>
                  <Select
                    value={newPartner.entityType}
                    onValueChange={(value) => setNewPartner({ ...newPartner, entityType: value })}
                  >
                    <SelectTrigger data-testid="select-entity-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLC">LLC</SelectItem>
                      <SelectItem value="Corporation">Corporation</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                      <SelectItem value="Individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select
                    value={newPartner.experienceLevel}
                    onValueChange={(value) => setNewPartner({ ...newPartner, experienceLevel: value })}
                  >
                    <SelectTrigger data-testid="select-experience-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="experienced">Experienced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newPartner.notes}
                  onChange={(e) => setNewPartner({ ...newPartner, notes: e.target.value })}
                  placeholder="Additional notes about this partner..."
                  data-testid="input-partner-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-partner">
                Cancel
              </Button>
              <Button
                onClick={handleCreatePartner}
                disabled={createPartnerMutation.isPending}
                data-testid="button-save-partner"
              >
                {createPartnerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Partner"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-partners"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {partners.length} partner{partners.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No partners yet</h3>
              <p className="text-muted-foreground mb-4">Add your first partner to start tracking referrals</p>
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-partner">
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="min-w-[180px]">Contact</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead className="text-center">Loans In Process</TableHead>
                    <TableHead className="text-center">All-Time Loans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id} data-testid={`row-partner-${partner.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                              {getInitials(partner.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium" data-testid={`text-partner-name-${partner.id}`}>
                              {partner.name}
                            </div>
                            {partner.companyName && (
                              <div className="text-sm text-muted-foreground">
                                {partner.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {partner.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              <span>{partner.email}</span>
                            </div>
                          )}
                          {partner.phone && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 mr-1.5" />
                              <span>{partner.phone}</span>
                            </div>
                          )}
                          {!partner.email && !partner.phone && (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {partner.entityType ? (
                          <div className="flex items-center text-sm">
                            {getEntityIcon(partner.entityType)}
                            <span>{partner.entityType}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getExperienceBadgeVariant(partner.experienceLevel)}>
                          {partner.experienceLevel || "beginner"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={partner.loansInProcess > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                          {partner.loansInProcess}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {partner.allTimeLoans}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
