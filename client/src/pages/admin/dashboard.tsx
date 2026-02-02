import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderKanban, FileCheck, ClipboardList, DollarSign, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  totalActiveUsers: number;
  regularUsers: number;
  activeProjects: number;
  completedProjects: number;
  completedAgreements: number;
  pendingAdminTasks: number;
  activePipelineValue: number;
  fundedVolume: number;
}

interface AdminActivityItem {
  id: number;
  projectId: number | null;
  userId: number | null;
  actionType: string;
  actionDescription: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<{ stats: DashboardStats; recentActivity: AdminActivityItem[] }>({
    queryKey: ["/api/admin/dashboard"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const activity = data?.recentActivity || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-dashboard-title">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActiveUsers || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.regularUsers || 0} regular users</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-projects">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.completedProjects || 0} completed</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pipeline">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.activePipelineValue || 0)}</div>
            <p className="text-xs text-muted-foreground">Active loans</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-funded">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Funded Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.fundedVolume || 0)}</div>
            <p className="text-xs text-muted-foreground">Total funded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-pending-tasks">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pending Admin Tasks
            </CardTitle>
            <CardDescription>Internal workflow items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{stats?.pendingAdminTasks || 0}</div>
                <p className="text-muted-foreground mt-1">tasks pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-agreements">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Completed Agreements
            </CardTitle>
            <CardDescription>Signed documents across all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">{stats?.completedAgreements || 0}</div>
                <p className="text-muted-foreground mt-1">agreements signed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-activity">
        <CardHeader>
          <CardTitle>Recent Admin Activity</CardTitle>
          <CardDescription>Latest actions taken by staff</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {item.actionType.replace(/_/g, " ")}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.actionDescription}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
