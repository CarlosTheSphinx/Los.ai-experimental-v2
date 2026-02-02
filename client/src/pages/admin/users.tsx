import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Search, MoreHorizontal, UserCog, Shield, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: number;
  email: string;
  fullName: string | null;
  companyName: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
  isActive: boolean;
}

const roleColors: Record<string, string> = {
  user: "bg-slate-100 text-slate-700",
  staff: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
  super_admin: "bg-red-100 text-red-700",
};

const roleIcons: Record<string, typeof UserIcon> = {
  user: UserIcon,
  staff: UserCog,
  admin: Shield,
  super_admin: Shield,
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users", { role: roleFilter !== "all" ? roleFilter : undefined, search: search || undefined }],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { role?: string; isActive?: boolean } }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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

  const users = data?.users || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-users-title">User Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts, roles, and access</CardDescription>
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const RoleIcon = roleIcons[user.role] || UserIcon;
                    return (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.fullName || "No name"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleColors[user.role] || ""}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {user.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.companyName || "-"}</TableCell>
                        <TableCell>
                          {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, yyyy") : "Never"}
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
                                Set as Staff
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, "admin")}>
                                Set as Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, "super_admin")}>
                                Set as Super Admin
                              </DropdownMenuItem>
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
    </div>
  );
}
