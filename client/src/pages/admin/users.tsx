import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, MoreHorizontal, UserCog, Shield, User as UserIcon, Plus, Users, Briefcase, Pencil, Mail, CheckCircle, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

function safeFormat(dateVal: any, fmt: string): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return format(d, fmt);
}
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatPhoneNumber, getPhoneError, getEmailError } from "@/lib/validation";

interface BetaSignup {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  createdAt: string;
}

interface AdminUser {
  id: number;
  email: string;
  fullName: string | null;
  companyName: string | null;
  phone: string | null;
  title: string | null;
  role: string;
  roles: string[];
  userType: string;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
  isActive: boolean;
  inviteStatus?: string;
}

const roleColors: Record<string, string> = {
  user: "bg-secondary text-secondary-foreground",
  processor: "bg-success/10 text-success",
  staff: "bg-info/10 text-info",
  admin: "bg-primary/10 text-primary",
  super_admin: "bg-destructive/10 text-destructive",
};

const roleIcons: Record<string, typeof UserIcon> = {
  user: UserIcon,
  processor: UserCog,
  staff: UserCog,
  admin: Shield,
  super_admin: Shield,
};

const roleLabels: Record<string, string> = {
  processor: "Processor",
  staff: "Staff",
  admin: "Admin",
  super_admin: "Super Admin",
};

const roleDescriptions: Record<string, string> = {
  processor: "Loan processing tasks based on configured permissions",
  staff: "Limited access based on configured permissions",
  admin: "Full access to most features, configurable permissions",
  super_admin: "Full unrestricted access to all features",
};

function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    companyName: "",
    phone: "",
    role: "user",
  });
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return await apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      refetch();
      setIsAddDialogOpen(false);
      setNewUser({ email: "", password: "", fullName: "", companyName: "", phone: "", role: "user" });
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error?.message || "Please check the form and try again",
        variant: "destructive"
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}`, updates);
    },
    onSuccess: () => {
      refetch();
      toast({ title: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const handleRoleChange = (userId: number, newRole: string) => {
    updateUserMutation.mutate({ id: userId, updates: { role: newRole } });
  };

  const handleActiveToggle = (userId: number, isActive: boolean) => {
    updateUserMutation.mutate({ id: userId, updates: { isActive } });
  };

  const allUsers = data?.users || [];
  const externalUsers = allUsers.filter(u => u.role === "user" || u.userType === "borrower");

  const filteredUsers = externalUsers.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.email?.toLowerCase().includes(s) || u.fullName?.toLowerCase().includes(s));
    }
    return true;
  });

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: "Email and password are required", variant: "destructive" });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div />
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new broker or borrower account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user-email">Email *</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  data-testid="input-new-user-email"
                />
                {getEmailError(newUser.email) && <p className="text-xs text-destructive mt-1">{getEmailError(newUser.email)}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-password">Password *</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Enter password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  data-testid="input-new-user-password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-fullName">Full Name</Label>
                <Input
                  id="user-fullName"
                  placeholder="John Doe"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  data-testid="input-new-user-fullname"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-companyName">Company Name</Label>
                <Input
                  id="user-companyName"
                  placeholder="Acme Corp"
                  value={newUser.companyName}
                  onChange={(e) => setNewUser({ ...newUser, companyName: e.target.value })}
                  data-testid="input-new-user-company"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-phone">Phone</Label>
                <Input
                  id="user-phone"
                  placeholder="(555) 123-4567"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: formatPhoneNumber(e.target.value) })}
                  data-testid="input-new-user-phone"
                />
                {getPhoneError(newUser.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(newUser.phone)}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                data-testid="button-cancel-add-user"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                data-testid="button-submit-add-user"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brokers & Borrowers</CardTitle>
          <CardDescription>Manage external user accounts and access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-users">No users found</p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.fullName || "No name"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {user.userType || "broker"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.companyName || "-"}</TableCell>
                      <TableCell>
                        {safeFormat(user.createdAt, "MMM d, yyyy") || "-"}
                      </TableCell>
                      <TableCell>
                        {safeFormat(user.lastLoginAt, "MMM d, yyyy") || "Never"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={(checked) => handleActiveToggle(user.id, checked)}
                          data-testid={`switch-active-${user.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "user")}>
                              Set as User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "staff")}>
                              Promote to Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "admin")}>
                              Promote to Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

function TeamTab() {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "processor",
  });
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (memberData: typeof newMember) => {
      const res = await apiRequest("POST", "/api/admin/invite-member", memberData);
      return res.json();
    },
    onSuccess: (data: any) => {
      refetch();
      setIsAddDialogOpen(false);
      setNewMember({ firstName: "", lastName: "", email: "", role: "processor" });
      toast({ 
        title: "Invitation sent",
        description: data.emailSent ? "An email invitation has been sent." : "Member created but email could not be sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to invite team member",
        description: error?.message || "Please check the form and try again",
        variant: "destructive"
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/resend-invite/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitation resent successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend invitation",
        description: error?.message || "Please try again",
        variant: "destructive"
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}`, updates);
    },
    onSuccess: () => {
      refetch();
      setIsEditDialogOpen(false);
      setEditingMember(null);
      toast({ title: "Team member updated" });
    },
    onError: () => {
      toast({ title: "Failed to update team member", variant: "destructive" });
    },
  });

  const handleActiveToggle = (userId: number, isActive: boolean) => {
    updateMemberMutation.mutate({ id: userId, updates: { isActive } });
  };

  const allUsers = data?.users || [];
  const teamRoleSet = new Set(["processor", "staff", "admin", "super_admin"]);
  const teamMembers = allUsers.filter(u => {
    if (teamRoleSet.has(u.role)) return true;
    if (u.roles?.some(r => teamRoleSet.has(r))) return true;
    return false;
  });

  const filteredMembers = teamMembers.filter(u => {
    if (search) {
      const s = search.toLowerCase();
      return (u.email?.toLowerCase().includes(s) || u.fullName?.toLowerCase().includes(s) || u.title?.toLowerCase().includes(s));
    }
    return true;
  });

  const handleCreateMember = () => {
    if (!newMember.email || !newMember.firstName || !newMember.lastName) {
      toast({ title: "First name, last name, and email are required", variant: "destructive" });
      return;
    }
    inviteMemberMutation.mutate(newMember);
  };

  const handleEditMember = () => {
    if (!editingMember) return;
    const editRoles = editingMember.roles?.length ? editingMember.roles : [editingMember.role];
    if (editRoles.length === 0) {
      toast({ title: "At least one role is required", variant: "destructive" });
      return;
    }
    updateMemberMutation.mutate({
      id: editingMember.id,
      updates: {
        fullName: editingMember.fullName,
        phone: editingMember.phone,
        title: editingMember.title,
        roles: editRoles,
      }
    });
  };

  const toggleRole = (roles: string[], role: string): string[] => {
    if (roles.includes(role)) {
      return roles.filter(r => r !== role);
    }
    return [...roles, role];
  };

  const openEditDialog = (member: AdminUser) => {
    setEditingMember({
      ...member,
      roles: member.roles?.length ? member.roles : [member.role],
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div />
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-team-member">
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an email invitation to join your team. They'll set up their own password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="team-firstname">First Name *</Label>
                  <Input
                    id="team-firstname"
                    placeholder="Jane"
                    value={newMember.firstName}
                    onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                    data-testid="input-team-firstname"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="team-lastname">Last Name *</Label>
                  <Input
                    id="team-lastname"
                    placeholder="Smith"
                    value={newMember.lastName}
                    onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                    data-testid="input-team-lastname"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team-email">Email *</Label>
                <Input
                  id="team-email"
                  type="email"
                  placeholder="team@company.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  data-testid="input-team-email"
                />
              </div>
              <div className="grid gap-2">
                <Label>Role *</Label>
                <Select value={newMember.role} onValueChange={(val) => setNewMember({ ...newMember, role: val })}>
                  <SelectTrigger data-testid="select-team-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processor">Processor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                data-testid="button-cancel-add-member"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMember}
                disabled={inviteMemberMutation.isPending}
                data-testid="button-submit-add-member"
              >
                {inviteMemberMutation.isPending ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
          <CardDescription>Internal team members with administrative access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-team"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-team">No team members found</p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const memberRoles = member.roles?.length ? member.roles : [member.role];
                    const inviteStatus = member.inviteStatus;
                    return (
                      <TableRow key={member.id} data-testid={`row-team-${member.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member.fullName || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{member.title || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {memberRoles.map((r) => {
                              const RoleIcon = roleIcons[r] || UserIcon;
                              return (
                                <Badge key={r} className={roleColors[r] || ""} data-testid={`badge-role-${member.id}-${r}`}>
                                  <RoleIcon className="h-3 w-3 mr-1" />
                                  {roleLabels[r] || r}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{member.phone || "-"}</span>
                        </TableCell>
                        <TableCell>
                          {inviteStatus === 'pending' ? (
                            <Badge variant="outline" data-testid={`badge-invite-status-${member.id}`}>
                              <Mail className="h-3 w-3 mr-1" />
                              Invite Pending
                            </Badge>
                          ) : inviteStatus === 'accepted' ? (
                            <Badge variant="secondary" data-testid={`badge-invite-status-${member.id}`}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accepted
                            </Badge>
                          ) : member.lastLoginAt ? (
                            <span className="text-sm text-muted-foreground">{safeFormat(member.lastLoginAt, "MMM d, yyyy")}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Active</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={member.isActive}
                            onCheckedChange={(checked) => handleActiveToggle(member.id, checked)}
                            data-testid={`switch-team-active-${member.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-team-actions-${member.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(member)} data-testid={`button-edit-member-${member.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              {inviteStatus === 'pending' && (
                                <DropdownMenuItem
                                  onClick={() => resendInviteMutation.mutate(member.id)}
                                  data-testid={`button-resend-invite-${member.id}`}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Resend Invite
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member details and role.
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={editingMember.email} disabled className="bg-muted" data-testid="input-edit-email" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={editingMember.fullName || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, fullName: e.target.value })}
                  data-testid="input-edit-fullname"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title / Position</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g. Loan Processor"
                  value={editingMember.title || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, title: e.target.value })}
                  data-testid="input-edit-title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="(555) 123-4567"
                  value={editingMember.phone || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  data-testid="input-edit-phone"
                />
              </div>
              <div className="grid gap-2">
                <Label>Roles</Label>
                <div className="space-y-2" data-testid="checkboxes-edit-roles">
                  {(["processor", "staff", "admin", "super_admin"] as const).map((r) => (
                    <div key={r} className="flex items-start gap-3 p-2 border rounded-md">
                      <Checkbox
                        id={`edit-role-${r}`}
                        checked={(editingMember.roles || [editingMember.role]).includes(r)}
                        onCheckedChange={() => {
                          const currentRoles = editingMember.roles?.length ? editingMember.roles : [editingMember.role];
                          const newRoles = toggleRole(currentRoles, r);
                          setEditingMember({ ...editingMember, roles: newRoles });
                        }}
                        data-testid={`checkbox-edit-role-${r}`}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label htmlFor={`edit-role-${r}`} className="text-sm font-medium cursor-pointer">
                          {roleLabels[r]}
                        </label>
                        <p className="text-xs text-muted-foreground">{roleDescriptions[r]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleEditMember}
              disabled={updateMemberMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMemberMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BetaWaitlistTab() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ signups: BetaSignup[] }>({
    queryKey: ["/api/super-admin/beta-signups"],
  });

  const allSignups = data?.signups || [];

  const filteredSignups = allSignups.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.email?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.company?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Beta Waitlist Signups</CardTitle>
          <CardDescription>
            Users who signed up through the Coming Soon page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-waitlist"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSignups.length === 0 ? (
            <p
              className="text-center text-muted-foreground py-8"
              data-testid="text-no-waitlist"
            >
              No waitlist signups found
            </p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Signed Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignups.map((signup) => (
                    <TableRow
                      key={signup.id}
                      data-testid={`row-waitlist-${signup.id}`}
                    >
                      <TableCell>
                        <span className="font-medium">
                          {signup.name || "No name"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {signup.email}
                        </span>
                      </TableCell>
                      <TableCell>{signup.company || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-waitlist-${signup.id}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          Waitlist
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {signup.createdAt
                          ? format(
                              new Date(signup.createdAt),
                              "MMM d, yyyy"
                            )
                          : "-"}
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

export default function AdminUsers() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const { data: waitlistData } = useQuery<{ signups: BetaSignup[] }>({
    queryKey: ["/api/super-admin/beta-signups"],
    enabled: isSuperAdmin,
  });

  const waitlistCount = waitlistData?.signups?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight" data-testid="text-admin-users-title">User Management</h1>

      <Tabs defaultValue="team" className="w-full">
        <TabsList data-testid="tabs-user-management">
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Briefcase className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="waitlist" data-testid="tab-waitlist">
              <Clock className="h-4 w-4 mr-2" />
              Beta Waitlist
              {waitlistCount > 0 && (
                <Badge variant="secondary" className="ml-2" data-testid="badge-waitlist-count">
                  {waitlistCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <TeamTab />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="waitlist" className="mt-4">
            <BetaWaitlistTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
