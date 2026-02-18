import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PERMISSION_CATEGORIES, TEAM_ROLES, type PermissionKey } from "@shared/schema";

interface PermissionState {
  [role: string]: {
    [key: string]: boolean;
  };
}

function TeamPermissionsPage() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>("processor");

  const { data, isLoading, refetch } = useQuery<PermissionState>({
    queryKey: ["team-permissions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/team-permissions");
      return response;
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (payload: {
      role: string;
      permissionKey: string;
      enabled: boolean;
    }) => {
      return await apiRequest("PUT", "/api/admin/team-permissions", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["team-permissions"] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (role: string, permissionKey: string, currentValue: boolean) => {
    updatePermissionMutation.mutate({
      role,
      permissionKey,
      enabled: !currentValue,
    });
  };

  const isEditableRole = (role: string) => {
    return ["processor"].includes(role);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Team Permissions</CardTitle>
            <CardDescription>
              Manage role-based permissions for team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleOptions = [
    { value: "processor", label: "Processor" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-10 w-10" />
          Team Permissions
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure role-based permissions for processors and admin users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permission Management</CardTitle>
          <CardDescription>
            Select a role to view and edit its permissions. Admin role has all permissions and cannot be modified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="processor" value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="grid w-full grid-cols-2">
              {roleOptions.map((role) => (
                <TabsTrigger key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    {role.label}
                    {["admin", "super_admin"].includes(role.value) && (
                      <Badge variant="secondary" className="ml-1">
                        Full
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {roleOptions.map((role) => (
              <TabsContent key={role.value} value={role.value} className="space-y-6">
                {!isEditableRole(role.value) && (
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">
                      Admin users have full access to all permissions.
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  {Object.entries(PERMISSION_CATEGORIES).map(
                    ([categoryKey, category]) => (
                      <div
                        key={categoryKey}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-base">
                            {category.label}
                          </h3>
                          <Badge variant="outline">
                            {category.permissions.filter((p) => {
                              const perms = data?.[role.value];
                              return perms?.[p.key];
                            }).length} / {category.permissions.length}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {category.permissions.map((permission) => {
                            const isEnabled = data?.[role.value]?.[permission.key] || false;
                            const isEditable = isEditableRole(role.value);

                            return (
                              <div
                                key={permission.key}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <Label
                                    htmlFor={`${role.value}-${permission.key}`}
                                    className="cursor-pointer flex-1 font-normal"
                                  >
                                    {permission.label}
                                  </Label>
                                  <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                                    {permission.key}
                                  </code>
                                </div>

                                {isEditable ? (
                                  <Switch
                                    id={`${role.value}-${permission.key}`}
                                    checked={isEnabled}
                                    onCheckedChange={() =>
                                      handleToggle(role.value, permission.key, isEnabled)
                                    }
                                    disabled={updatePermissionMutation.isPending}
                                  />
                                ) : (
                                  <Badge
                                    variant={isEnabled ? "default" : "secondary"}
                                  >
                                    {isEnabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-muted/50 border-muted">
        <CardHeader>
          <CardTitle className="text-sm">Role Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-semibold">Processor:</span> Can be assigned to specific deals and tasks. Permissions are customizable above.
          </p>
          <p>
            <span className="font-semibold">Admin:</span> Has full access to all
            permissions and settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamPermissionsPage;
