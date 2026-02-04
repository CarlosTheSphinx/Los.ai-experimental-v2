import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Activity,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Task {
  id: number;
  taskTitle: string;
  taskType: string;
  priority: string;
  status: string;
  completedAt: string | null;
  visibleToBorrower: boolean;
  borrowerActionRequired: boolean;
}

interface Stage {
  id: number;
  stageName: string;
  stageKey: string;
  stageOrder: number;
  stageDescription: string;
  status: string;
  tasks: Task[];
}

interface ActivityItem {
  id: number;
  activityType: string;
  activityDescription: string;
  createdAt: string;
}

interface Project {
  id: number;
  projectNumber: string;
  projectName: string;
  borrowerName: string;
  status: string;
  currentStage: string;
  progressPercentage: number;
  loanAmount: number | null;
  interestRate: number | null;
  loanTermMonths: number | null;
  loanType: string | null;
  propertyAddress: string | null;
  targetCloseDate: string | null;
  applicationDate: string | null;
  notes: string | null;
}

export default function BorrowerPortal() {
  const [, params] = useRoute("/portal/:token");
  const token = params?.token;

  const { data, isLoading, error } = useQuery<{ 
    project: Project; 
    stages: Stage[]; 
    activity: ActivityItem[];
  }>({
    queryKey: ['/api/portal', token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load portal');
      }
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-48 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-64 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Portal Not Available</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'This borrower portal link is invalid or has been disabled.'}
          </p>
        </Card>
      </div>
    );
  }

  const { project, stages, activity } = data;

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', { 
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
    });
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const totalTasks = stages.reduce((sum, s) => sum + s.tasks.length, 0);
  const completedTasks = stages.reduce((sum, s) => sum + s.tasks.filter(t => t.status === 'completed').length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs md:text-sm text-muted-foreground font-mono truncate">{project.projectNumber}</div>
              <h1 className="text-lg md:text-xl font-semibold truncate">{project.projectName}</h1>
            </div>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
              {project.status}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
        <Card>
          <CardHeader className="pb-3 p-4 md:p-6 md:pb-3">
            <div className="flex items-start md:items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <CardTitle className="text-base md:text-lg truncate">Welcome, {project.borrowerName}</CardTitle>
                <CardDescription className="text-xs md:text-sm">Track your loan progress</CardDescription>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl md:text-3xl font-bold text-primary">{project.progressPercentage}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
            <Progress value={project.progressPercentage} className="h-2 md:h-3" />
            
            <div className="flex flex-wrap gap-1 overflow-x-auto">
              {stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-1">
                  {getStageIcon(stage.status)}
                  <span className={`text-[10px] md:text-xs whitespace-nowrap ${stage.status === 'in_progress' ? 'font-medium text-blue-600' : stage.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {stage.stageName}
                  </span>
                  {i < stages.length - 1 && (
                    <div className={`h-px w-2 md:w-4 ${stage.status === 'completed' ? 'bg-green-300' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] md:text-xs text-muted-foreground">Loan Amount</div>
                <div className="font-semibold text-sm md:text-base truncate">{formatCurrency(project.loanAmount)}</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-blue-600 font-semibold text-xs md:text-sm">%</span>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] md:text-xs text-muted-foreground">Interest Rate</div>
                <div className="font-semibold text-sm md:text-base">{project.interestRate ? `${project.interestRate}%` : '—'}</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] md:text-xs text-muted-foreground">Target Close</div>
                <div className="font-semibold text-sm md:text-base">{formatDate(project.targetCloseDate)}</div>
              </div>
            </div>
          </Card>
        </div>

        {project.propertyAddress && (
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Property:</span>
              <span className="text-sm text-muted-foreground">{project.propertyAddress}</span>
            </div>
          </Card>
        )}

        <Tabs defaultValue="checklist" className="space-y-4">
          <TabsList>
            <TabsTrigger value="checklist">
              <CheckSquare className="h-4 w-4 mr-2" />
              Checklist ({completedTasks}/{totalTasks})
            </TabsTrigger>
            <TabsTrigger value="updates">
              <Activity className="h-4 w-4 mr-2" />
              Updates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-4">
            {stages.map((stage) => (
              <Card key={stage.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {getStageIcon(stage.status)}
                    <div>
                      <CardTitle className="text-base">{stage.stageName}</CardTitle>
                      <CardDescription>{stage.stageDescription}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {stage.tasks.length > 0 && (
                  <CardContent>
                    <div className="space-y-3">
                      {stage.tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.taskTitle}
                            </div>
                            {task.borrowerActionRequired && task.status !== 'completed' && (
                              <Badge variant="outline" className="text-xs mt-1">Action Required</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="updates">
            <Card>
              <CardContent className="pt-6">
                {activity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No updates yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activity.map((item, i) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          {i < activity.length - 1 && <div className="flex-1 w-px bg-border" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="text-sm">{item.activityDescription}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {project.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.notes}</p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t bg-white mt-12">
        <div className="max-w-4xl mx-auto px-6 py-4 text-center text-sm text-muted-foreground">
          Loan Progress Portal - Powered by Sphinx Capital
        </div>
      </footer>
    </div>
  );
}
