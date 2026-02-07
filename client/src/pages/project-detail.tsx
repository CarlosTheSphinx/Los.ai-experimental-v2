import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Copy,
  Send,
  MoreHorizontal,
  Building2,
  Calendar,
  CalendarDays,
  DollarSign,
  User,
  Mail,
  Phone,
  FileText,
  Activity,
  CheckSquare,
  MapPin,
  RefreshCw,
  Upload,
  FolderOpen,
  CloudOff,
  Loader2,
  HardDrive,
  Download,
  Trash2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DigestConfigPanel } from "@/components/DigestConfigPanel";

interface Task {
  id: number;
  taskTitle: string;
  taskType: string;
  priority: string;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
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
  startedAt: string | null;
  completedAt: string | null;
  tasks: Task[];
}

interface ActivityItem {
  id: number;
  activityType: string;
  activityDescription: string;
  createdAt: string;
  visibleToBorrower: boolean;
}

interface ProjectDocument {
  id: number;
  projectId: number;
  documentName: string;
  documentType: string | null;
  documentCategory: string;
  filePath: string;
  fileSize: number | null;
  uploadedBy: number;
  status: string;
  uploadedAt: string;
  googleDriveFileId: string | null;
  googleDriveFileUrl: string | null;
  driveUploadStatus: string;
  driveUploadError: string | null;
}

interface Project {
  id: number;
  projectNumber: string;
  projectName: string;
  status: string;
  currentStage: string;
  progressPercentage: number;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string | null;
  loanAmount: number | null;
  interestRate: number | null;
  loanTermMonths: number | null;
  loanType: string | null;
  propertyAddress: string | null;
  propertyType: string | null;
  targetCloseDate: string | null;
  applicationDate: string | null;
  borrowerPortalEnabled: boolean;
  borrowerPortalToken: string | null;
  notes: string | null;
  createdAt: string;
  googleDriveFolderId: string | null;
  googleDriveFolderUrl: string | null;
  driveSyncStatus: string;
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const { data, isLoading, refetch } = useQuery<{ 
    project: Project; 
    stages: Stage[]; 
    activity: ActivityItem[];
  }>({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: docsData, refetch: refetchDocs } = useQuery<{ documents: ProjectDocument[] }>({
    queryKey: ['/api/projects', projectId, 'documents'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/documents`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    },
    enabled: !!projectId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: "Task updated" });
    },
  });

  const retryDriveFolderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/projects/${projectId}/drive/retry`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: "Drive folder sync retried" });
    },
    onError: () => {
      toast({ title: "Drive folder sync failed", variant: "destructive" });
    },
  });

  const retryDriveDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      return apiRequest('POST', `/api/documents/${docId}/drive/retry`, {});
    },
    onSuccess: () => {
      refetchDocs();
      toast({ title: "Drive upload retried" });
    },
    onError: () => {
      toast({ title: "Drive upload retry failed", variant: "destructive" });
    },
  });

  const handleFileUpload = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      const fileName = file.name;
      setUploadingFiles(prev => [...prev, fileName]);
      try {
        const urlRes = await apiRequest('POST', `/api/projects/${projectId}/documents/upload-url`, {
          name: file.name,
          size: file.size,
          contentType: file.type,
        });
        const urlData = await urlRes.json();

        await fetch(urlData.uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });

        await apiRequest('POST', `/api/projects/${projectId}/documents/upload-complete`, {
          objectPath: urlData.objectPath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });

        toast({ title: `Uploaded: ${file.name}` });
      } catch (err) {
        toast({ title: `Failed to upload ${file.name}`, variant: "destructive" });
      } finally {
        setUploadingFiles(prev => prev.filter(f => f !== fileName));
      }
    }
    refetchDocs();
    refetch();
  }, [projectId, toast, refetchDocs, refetch]);

  const copyBorrowerLink = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/borrower-link`, { credentials: 'include' });
      const { borrowerLink } = await res.json();
      await navigator.clipboard.writeText(borrowerLink);
      toast({ title: "Borrower portal link copied" });
    } catch (e) {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const pushToLOS = async () => {
    try {
      await apiRequest('POST', `/api/projects/${projectId}/push-to-los`, {});
      toast({ title: "Project pushed to LOS" });
      refetch();
    } catch (e) {
      toast({ title: "Failed to push to LOS", variant: "destructive" });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case 'high': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">{project.projectNumber}</span>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
          </div>
          <h1 className="text-xl font-semibold" data-testid="text-project-name">{project.projectName}</h1>
          {project.driveSyncStatus === 'OK' && project.googleDriveFolderId && (
            <a 
              href={`https://drive.google.com/drive/folders/${project.googleDriveFolderId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              data-testid="link-drive-folder"
            >
              <HardDrive className="h-3 w-3" />
              Google Drive Folder
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {project.driveSyncStatus === 'PENDING' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing Drive folder...
            </span>
          )}
          {project.driveSyncStatus === 'ERROR' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
              <CloudOff className="h-3 w-3" />
              Drive folder sync failed
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyBorrowerLink} data-testid="button-copy-portal-link">
            <Copy className="h-4 w-4 mr-2" />
            Borrower Link
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-more-actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={pushToLOS}>
                <Send className="h-4 w-4 mr-2" />
                Push to LOS
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Borrower Portal
              </DropdownMenuItem>
              {project.googleDriveFolderId && (
                <DropdownMenuItem onClick={() => window.open(`https://drive.google.com/drive/folders/${project.googleDriveFolderId}`, '_blank')}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open Drive Folder
                </DropdownMenuItem>
              )}
              {project.driveSyncStatus === 'ERROR' && (
                <DropdownMenuItem onClick={() => retryDriveFolderMutation.mutate()} disabled={retryDriveFolderMutation.isPending}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Drive Folder Sync
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Loan Progress</CardTitle>
              <span className="text-2xl font-bold">{project.progressPercentage}%</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={project.progressPercentage} className="h-3" />
            
            <div className="flex flex-wrap gap-1">
              {stages.map((stage, i) => (
                <div 
                  key={stage.id} 
                  className="flex items-center gap-1"
                >
                  {getStageIcon(stage.status)}
                  <span className={`text-xs ${stage.status === 'in_progress' ? 'font-medium text-blue-600' : stage.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {stage.stageName}
                  </span>
                  {i < stages.length - 1 && (
                    <div className={`h-px w-4 ${stage.status === 'completed' ? 'bg-green-300' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Borrower
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">{project.borrowerName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>{project.borrowerEmail}</span>
            </div>
            {project.borrowerPhone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{project.borrowerPhone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Loan Amount</div>
              <div className="font-semibold">{formatCurrency(project.loanAmount)}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">%</span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Interest Rate</div>
              <div className="font-semibold">{project.interestRate ? `${project.interestRate}%` : '—'}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Term</div>
              <div className="font-semibold">{project.loanTermMonths ? `${project.loanTermMonths} months` : '—'}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Property</div>
              <div className="font-semibold truncate">{project.propertyType || '—'}</div>
            </div>
          </div>
        </Card>
      </div>

      {project.propertyAddress && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Property Address:</span>
            <span className="text-sm text-muted-foreground">{project.propertyAddress}</span>
          </div>
        </Card>
      )}

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="digests" data-testid="tab-digests">
            <CalendarDays className="h-4 w-4 mr-2" />
            Digests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {stages.map((stage) => (
            <Card key={stage.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStageIcon(stage.status)}
                    <div>
                      <CardTitle className="text-base">{stage.stageName}</CardTitle>
                      <CardDescription>{stage.stageDescription}</CardDescription>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stage.tasks.filter(t => t.status === 'completed').length}/{stage.tasks.length} complete
                  </div>
                </div>
              </CardHeader>
              {stage.tasks.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {stage.tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={(checked) => {
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              status: checked ? 'completed' : 'pending'
                            });
                          }}
                          data-testid={`checkbox-task-${task.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.taskTitle}
                            </span>
                            {getPriorityBadge(task.priority)}
                            {task.borrowerActionRequired && (
                              <Badge variant="outline" className="text-xs">Borrower Action</Badge>
                            )}
                          </div>
                          {task.completedAt && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Completed {formatDateTime(task.completedAt)}
                              {task.completedBy && ` by ${task.completedBy}`}
                            </div>
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

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6">
              {activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity yet
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

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base">Project Documents</CardTitle>
              <div className="flex items-center gap-2">
                {project.googleDriveFolderId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://drive.google.com/drive/folders/${project.googleDriveFolderId}`, '_blank')}
                    data-testid="button-open-drive"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Drive Folder
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files);
                      e.target.value = '';
                    }
                  }}
                  data-testid="input-file-upload"
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles.length > 0}
                  data-testid="button-upload-document"
                >
                  {uploadingFiles.length > 0 ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {uploadingFiles.length > 0 && (
                <div className="mb-4 space-y-2">
                  {uploadingFiles.map((name) => (
                    <div key={name} className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading {name}...
                    </div>
                  ))}
                </div>
              )}
              {(!docsData?.documents || docsData.documents.length === 0) && uploadingFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No documents uploaded yet</p>
                  <p className="text-xs mt-1">Upload files to store them here and sync to Google Drive</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docsData?.documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center gap-3 p-3 rounded-md border"
                      data-testid={`doc-row-${doc.id}`}
                    >
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{doc.documentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''} 
                          {doc.uploadedAt && ` · ${formatDateTime(doc.uploadedAt)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.driveUploadStatus === 'OK' && doc.googleDriveFileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.googleDriveFileUrl!, '_blank')}
                            title="View in Google Drive"
                            data-testid={`button-drive-view-${doc.id}`}
                          >
                            <HardDrive className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {doc.driveUploadStatus === 'PENDING' && (
                          <span title="Syncing to Drive">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </span>
                        )}
                        {doc.driveUploadStatus === 'ERROR' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => retryDriveDocMutation.mutate(doc.id)}
                            disabled={retryDriveDocMutation.isPending}
                            title={`Drive upload failed: ${doc.driveUploadError || 'Unknown error'}. Click to retry.`}
                            data-testid={`button-drive-retry-${doc.id}`}
                          >
                            <CloudOff className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {doc.status === 'pending_review' ? 'Pending' : doc.status === 'approved' ? 'Approved' : doc.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="digests">
          {projectId && <DigestConfigPanel projectId={Number(projectId)} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
