import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  FileText,
  MessageSquare,
  Loader2,
  Building2,
  DollarSign,
  ChevronRight,
  Shield,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ProjectItem {
  id: number;
  projectName: string;
  borrowerName: string;
  propertyAddress: string | null;
  status: string;
  currentStage: string;
  progressPercentage: number;
  loanAmount: number | null;
  loanType: string | null;
  programName?: string | null;
  loanNumber?: string | null;
  completedTasks: number;
  totalTasks: number;
  completedDocs: number;
  totalDocs: number;
}

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    'application': 'Application',
    'processing': 'Processing',
    'underwriting': 'Underwriting',
    'approval': 'Approval',
    'conditions': 'Conditions',
    'title': 'Title & Escrow',
    'appraisal': 'Appraisal',
    'documentation': 'Documentation',
    'final-review': 'Final Review',
    'closing': 'Closing',
    'funded': 'Funded',
  };
  return labels[stage] || stage?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Processing';
}

export function BorrowerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ projects: ProjectItem[] }>({
    queryKey: ['/api/deals'],
    refetchInterval: 30000,
  });

  const projects = data?.projects || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight mb-1" data-testid="text-welcome">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="text-muted-foreground">
          Track your loan progress and manage required documents
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-loans">No Active Loans</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have any active loans yet. Once your loan application is submitted,
              you'll be able to track its progress here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-loans-header">
              My Loans ({projects.length})
            </h2>
          </div>

          {projects.map((project) => {
            const completedItems = (project.completedTasks || 0) + (project.completedDocs || 0);
            const totalItems = (project.totalTasks || 0) + (project.totalDocs || 0);
            const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            return (
              <Card
                key={project.id}
                className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => setLocation(`/deals/${project.id}`)}
                data-testid={`loan-card-${project.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] text-muted-foreground font-medium" data-testid={`text-loan-number-${project.id}`}>
                            {project.loanNumber || `Loan #${project.id}`}
                          </span>
                          <h3 className="text-[16px] font-semibold truncate group-hover:text-primary transition-colors" data-testid={`text-loan-address-${project.id}`}>
                            {project.propertyAddress?.replace(/,?\s*United States of America$/i, '') || project.projectName || `Loan #${project.id}`}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(project.loanAmount)}
                            </span>
                            {project.programName && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {project.programName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'default' : 'secondary'}
                            className={project.status === 'active' ? 'bg-emerald-600' : project.status === 'completed' ? 'bg-blue-600' : ''}
                            data-testid={`badge-status-${project.id}`}
                          >
                            {project.status === 'active' ? 'In Progress' : project.status === 'completed' ? 'Completed' : project.status === 'on_hold' ? 'On Hold' : project.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[11px] font-medium" data-testid={`badge-stage-${project.id}`}>
                            {getStageLabel(project.currentStage)}
                          </Badge>
                          <span className="text-[13px] text-muted-foreground font-medium" data-testid={`text-progress-${project.id}`}>
                            {completedItems}/{totalItems} completed
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>

                      <div className="mt-2.5 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3 pt-2">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/inbox')} data-testid="card-messages">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[14px]">Messages</p>
              <p className="text-[12px] text-muted-foreground">Contact your loan team</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/resources')} data-testid="card-resources">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[14px]">Resources</p>
              <p className="text-[12px] text-muted-foreground">Documents and guides</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/quotes')} data-testid="card-quotes">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[14px]">Get a Quote</p>
              <p className="text-[12px] text-muted-foreground">Instant loan pricing</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>256-bit encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>FCRA & TILA compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <span>Support available 8am–6pm EST</span>
          </div>
        </div>
      </div>
    </div>
  );
}
