import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  Bell,
  Shield,
  Loader2,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: (user as any)?.phone || "",
    companyName: (user as any)?.companyName || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      return await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to change password", variant: "destructive" });
    },
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-settings">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-semibold shrink-0">
                  {(user?.fullName || user?.email || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-lg">{user?.fullName || "—"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">{(user as any)?.userType || "broker"}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Full Name
                  </Label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    data-testid="input-settings-fullname"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    value={profileForm.email}
                    disabled
                    className="bg-muted"
                    data-testid="input-settings-email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> Phone
                  </Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-settings-phone"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Company
                  </Label>
                  <Input
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                    placeholder="Company name"
                    data-testid="input-settings-company"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleProfileSave}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPw ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                  >
                    {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowNewPw(!showNewPw)}
                  >
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  data-testid="input-confirm-password"
                />
              </div>
              <div className="pt-2">
                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>Choose how you'd like to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates about your loans and quotes via email</p>
                </div>
                <Switch defaultChecked data-testid="switch-email-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New Message Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when you receive new messages</p>
                </div>
                <Switch defaultChecked data-testid="switch-message-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Deal Status Updates</p>
                  <p className="text-xs text-muted-foreground">Get notified when your deals change status</p>
                </div>
                <Switch defaultChecked data-testid="switch-deal-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Commission Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified about commission payments and updates</p>
                </div>
                <Switch defaultChecked data-testid="switch-commission-notifications" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
