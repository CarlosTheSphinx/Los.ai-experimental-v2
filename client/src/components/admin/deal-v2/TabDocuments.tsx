import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/phase1/collapsible-section";
import { EmptyState } from "@/components/ui/phase1/empty-state";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

function getDocIcon(status: string) {
  switch (status?.toLowerCase()) {
    case "approved":
    case "accepted":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "pending":
    case "in_review":
      return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    case "rejected":
      return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function TabDocuments({
  deal,
  documents,
  dealId,
}: {
  deal: any;
  documents: any[];
  dealId: string;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const fileName = file.name;
        setUploadingFiles((prev) => [...prev, fileName]);
        try {
          const urlRes = await apiRequest("POST", `/api/deals/${dealId}/documents/upload-url`, {
            name: file.name,
            size: file.size,
            contentType: file.type,
          });
          const urlData = await urlRes.json();

          let objectPath: string;
          if (urlData.useDirectUpload) {
            const fd = new FormData();
            fd.append("file", file);
            const dr = await fetch(urlData.uploadURL, { method: "POST", body: fd, credentials: "include" });
            if (!dr.ok) throw new Error("Upload failed");
            objectPath = (await dr.json()).objectPath;
          } else {
            await fetch(urlData.uploadURL, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type || "application/octet-stream" },
            });
            objectPath = urlData.objectPath;
          }

          await apiRequest("POST", `/api/deals/${dealId}/documents/upload-complete`, {
            objectPath,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });

          toast({ title: `Uploaded: ${file.name}` });
        } catch {
          toast({ title: `Failed to upload ${file.name}`, variant: "destructive" });
        } finally {
          setUploadingFiles((prev) => prev.filter((f) => f !== fileName));
        }
      }
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/documents`] });
    },
    [dealId, toast]
  );

  // Group documents by category
  const grouped = documents.reduce<Record<string, any[]>>((acc, doc) => {
    const cat = doc.documentCategory || doc.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  const categories = Object.keys(grouped);
  const uploaded = documents.filter((d) => d.filePath || d.fileName).length;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px]">
              <span className="font-medium">{uploaded}</span>
              <span className="text-muted-foreground"> of {documents.length} documents uploaded</span>
            </div>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
          </div>
          {uploadingFiles.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {uploadingFiles.map((f) => (
                <div key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading {f}...
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents by Category */}
      {categories.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload documents to get started."
          actionLabel="Upload"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        categories.map((cat) => (
          <CollapsibleSection
            key={cat}
            title={cat}
            badge={`${grouped[cat].filter((d: any) => d.filePath || d.fileName).length}/${grouped[cat].length}`}
            defaultOpen={true}
          >
            <div className="space-y-1">
              {grouped[cat].map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 text-[13px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {getDocIcon(doc.status)}
                    <span className="truncate font-medium">{doc.documentName || doc.fileName || "Untitled"}</span>
                    {doc.isRequired && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                    {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                    <Badge
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {doc.status || "Pending"}
                    </Badge>
                    {doc.googleDriveFileUrl && (
                      <a href={doc.googleDriveFileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        ))
      )}
    </div>
  );
}
