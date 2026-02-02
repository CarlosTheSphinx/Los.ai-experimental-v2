import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, ExternalLink, User } from "lucide-react";
import { format } from "date-fns";

interface AdminProject {
  id: number;
  projectNumber: string;
  projectName: string;
  borrowerName: string | null;
  propertyAddress: string | null;
  loanAmount: number | null;
  status: string;
  currentStage: string | null;
  progressPercentage: number;
  lastUpdated: string | null;
  ownerName: string;
  ownerEmail: string;
}

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  funded: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminProjects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ projects: AdminProject[] }>({
    queryKey: ["/api/admin/projects", { status: statusFilter !== "all" ? statusFilter : undefined }],
  });

  const projects = (data?.projects || []).filter((p) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.projectNumber.toLowerCase().includes(searchLower) ||
      p.projectName.toLowerCase().includes(searchLower) ||
      p.borrowerName?.toLowerCase().includes(searchLower) ||
      p.propertyAddress?.toLowerCase().includes(searchLower) ||
      p.ownerName.toLowerCase().includes(searchLower) ||
      p.ownerEmail.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-projects-title">All Projects</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Pipeline</CardTitle>
          <CardDescription>View and manage all loan closing projects across users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-projects"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No projects found</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.projectNumber}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {project.projectName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{project.ownerName}</p>
                            <p className="text-xs text-muted-foreground">{project.ownerEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{project.borrowerName || "-"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {project.propertyAddress || ""}
                        </p>
                      </TableCell>
                      <TableCell>{formatCurrency(project.loanAmount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={project.progressPercentage} className="w-16 h-2" />
                          <span className="text-sm text-muted-foreground">{project.progressPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[project.status] || ""}>
                          {project.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {project.lastUpdated
                          ? format(new Date(project.lastUpdated), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/projects/${project.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-project-${project.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
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
