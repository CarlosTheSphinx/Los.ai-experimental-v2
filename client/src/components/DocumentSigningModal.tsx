import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Users, FileText, Send, Plus, Trash2, X, ChevronRight, ChevronLeft, Check, Mail, ZoomIn, ZoomOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SavedQuote, Document, Signer, DocumentField } from "@shared/schema";
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-resizable/css/styles.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentSigningModalProps {
  open: boolean;
  onClose: () => void;
  quote: SavedQuote;
}

const SIGNER_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const SIGNATURE_FIELD_TYPES = [
  { type: "signature", label: "Signature", width: 200, height: 50 },
  { type: "initial", label: "Initials", width: 80, height: 40 },
  { type: "text", label: "Text", width: 150, height: 30 },
  { type: "date", label: "Date", width: 120, height: 30 }
];

const PREPOPULATED_FIELD_TYPES = [
  { type: "loanAmount", label: "Loan Amount", width: 120, height: 25 },
  { type: "interestRate", label: "Interest Rate", width: 80, height: 25 },
  { type: "propertyType", label: "Property Type", width: 120, height: 25 },
  { type: "loanPurpose", label: "Loan Purpose", width: 120, height: 25 },
  { type: "fullName", label: "Full Name", width: 180, height: 25 },
  { type: "firstName", label: "First Name", width: 120, height: 25 },
  { type: "propertyValue", label: "Property Value", width: 120, height: 25 },
  { type: "fico", label: "FICO", width: 60, height: 25 },
  { type: "ltv", label: "LTV", width: 80, height: 25 },
  { type: "prepaymentPenalty", label: "Prepay Penalty", width: 100, height: 25 },
  { type: "estimatedDscr", label: "Est. DSCR", width: 80, height: 25 },
  { type: "fullAddress", label: "Full Address", width: 250, height: 25 },
  { type: "originationFee", label: "Origination Fee", width: 120, height: 25 }
];

function getFieldValue(type: string, quote: SavedQuote): string {
  const loanData = quote.loanData as Record<string, unknown> || {};
  
  const formatCurrency = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  };
  
  const formatPercent = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';
    return `${num.toFixed(3)}%`;
  };

  switch (type) {
    case 'loanAmount': return formatCurrency(loanData.loanAmount as number);
    case 'interestRate': return formatPercent(quote.interestRate);
    case 'propertyType': return String(loanData.propertyType || '');
    case 'loanPurpose': return String(loanData.loanPurpose || '');
    case 'fullName': return `${quote.customerFirstName || ''} ${quote.customerLastName || ''}`.trim();
    case 'firstName': return quote.customerFirstName || '';
    case 'propertyValue': return formatCurrency(loanData.propertyValue as number);
    case 'fico': return String(loanData.ficoScore || '');
    case 'ltv': return loanData.ltv ? `${loanData.ltv}%` : '';
    case 'prepaymentPenalty': return String(loanData.prepaymentPenalty || '');
    case 'estimatedDscr': return String(loanData.calculatedDscr || loanData.dscr || '');
    case 'fullAddress': return quote.propertyAddress || '';
    case 'originationFee': return formatCurrency(quote.pointsAmount);
    default: return '';
  }
}

interface FieldData {
  id?: number;
  signerId: number;
  pageNumber: number;
  fieldType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
}

interface DraggableFieldProps {
  field: FieldData;
  index: number;
  signer: { id?: number; name: string; email: string; color: string } | undefined;
  onUpdate: (index: number, updates: Partial<FieldData>) => void;
  onRemove: (index: number) => void;
  containerWidth: number;
  containerHeight: number;
}

function DraggableField({ field, index, signer, onUpdate, onRemove, containerWidth, containerHeight }: DraggableFieldProps) {
  const [position, setPosition] = useState({ x: field.x, y: field.y });
  const [size, setSize] = useState({ width: field.width, height: field.height });
  const [isDragging, setIsDragging] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const isPrepopulated = PREPOPULATED_FIELD_TYPES.some(f => f.type === field.fieldType);
  const fieldLabel = [...SIGNATURE_FIELD_TYPES, ...PREPOPULATED_FIELD_TYPES].find(f => f.type === field.fieldType)?.label || field.fieldType;

  useEffect(() => {
    setPosition({ x: field.x, y: field.y });
    setSize({ width: field.width, height: field.height });
  }, [field.x, field.y, field.width, field.height]);

  const handleDrag = (_e: any, data: { x: number; y: number }) => {
    setPosition({ x: data.x, y: data.y });
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    setIsDragging(false);
    onUpdate(index, { x: data.x, y: data.y });
  };

  const handleResize = (_e: any, { size: newSize }: { size: { width: number; height: number } }) => {
    setSize({ width: newSize.width, height: newSize.height });
  };

  const handleResizeStop = (_e: any, { size: newSize }: { size: { width: number; height: number } }) => {
    onUpdate(index, { width: newSize.width, height: newSize.height });
  };

  const bounds = {
    left: 0,
    top: 0,
    right: Math.max(0, containerWidth - size.width),
    bottom: Math.max(0, containerHeight - size.height)
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onDrag={handleDrag}
      onStart={handleDragStart}
      onStop={handleDragStop}
      bounds={bounds}
      grid={[1, 1]}
    >
      <div ref={nodeRef} style={{ position: 'absolute', zIndex: isDragging ? 1000 : 1 }}>
        <Resizable
          width={size.width}
          height={size.height}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          minConstraints={[40, 20]}
          maxConstraints={[400, 100]}
          resizeHandles={['se']}
        >
          <div
            className={`group cursor-move select-none ${isDragging ? 'opacity-80 shadow-lg' : 'hover:shadow-md'}`}
            style={{
              width: size.width,
              height: size.height,
              border: `2px solid ${signer?.color || '#3B82F6'}`,
              backgroundColor: isPrepopulated ? '#FEF3C7' : `${signer?.color || '#3B82F6'}20`,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isDragging ? 'none' : 'box-shadow 0.2s'
            }}
            data-testid={`field-${field.fieldType}-${index}`}
          >
            <span 
              className="text-xs font-medium truncate px-1" 
              style={{ color: isPrepopulated ? '#92400E' : signer?.color }}
            >
              {isPrepopulated && field.value ? field.value : fieldLabel}
            </span>
            <button
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
              onClick={(e) => { e.stopPropagation(); onRemove(index); }}
              onMouseDown={(e) => e.stopPropagation()}
              data-testid={`remove-field-${index}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
}

export function DocumentSigningModal({ open, onClose, quote }: DocumentSigningModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "signers" | "fields" | "send">("upload");
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [signers, setSigners] = useState<Array<{ id?: number; name: string; email: string; color: string }>>([]);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [fields, setFields] = useState<FieldData[]>([]);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [selectedSignerIndex, setSelectedSignerIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [senderName, setSenderName] = useState("Sphinx Capital");
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 612, height: 792 });
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPageCount(numPages);
  };

  const onPageLoadSuccess = (page: any) => {
    const viewport = page.getViewport({ scale: 1.0 });
    setPdfDimensions({ width: viewport.width, height: viewport.height });
  };

  const createDocumentMutation = useMutation({
    mutationFn: async (data: { name: string; fileName: string; fileData: string; pageCount: number }) => {
      const res = await apiRequest('POST', '/api/documents', {
        quoteId: quote.id,
        ...data
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.document) {
        setDocumentId(data.document.id);
        toast({ title: "Document Uploaded", description: "PDF uploaded successfully" });
        setStep("signers");
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    }
  });

  const addSignerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; color: string }) => {
      const res = await apiRequest('POST', `/api/documents/${documentId}/signers`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.signer) {
        setSigners(prev => [...prev, { ...data.signer }]);
        setNewSignerName("");
        setNewSignerEmail("");
      }
    }
  });

  const deleteSignerMutation = useMutation({
    mutationFn: async (signerId: number) => {
      await apiRequest('DELETE', `/api/signers/${signerId}`);
      return signerId;
    },
    onSuccess: (signerId) => {
      setSigners(prev => prev.filter(s => s.id !== signerId));
      setFields(prev => prev.filter(f => f.signerId !== signerId));
    }
  });

  const saveFieldsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/documents/${documentId}/fields/bulk`, { fields });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Fields Saved", description: "Signature fields saved successfully" });
      setStep("send");
    }
  });

  const sendDocumentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/documents/${documentId}/send`, { senderName });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Document Sent!", description: `Signing invitations sent to ${signers.length} signer(s)` });
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
        onClose();
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send document", variant: "destructive" });
    }
  });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Invalid File", description: "Please upload a PDF file", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPdfData(base64);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleUploadSubmit = () => {
    if (!pdfData || !fileName) return;
    createDocumentMutation.mutate({
      name: `Agreement for ${quote.customerFirstName} ${quote.customerLastName}`,
      fileName,
      fileData: pdfData,
      pageCount
    });
  };

  const handleAddSigner = () => {
    if (!newSignerName.trim() || !newSignerEmail.trim()) {
      toast({ title: "Missing Info", description: "Please enter name and email", variant: "destructive" });
      return;
    }
    
    const color = SIGNER_COLORS[signers.length % SIGNER_COLORS.length];
    addSignerMutation.mutate({ name: newSignerName, email: newSignerEmail, color });
  };

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedFieldType || selectedSignerIndex < 0 || !signers[selectedSignerIndex]?.id) return;
    
    const container = pdfContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pdfScale;
    const y = (e.clientY - rect.top) / pdfScale;
    
    const allFieldTypes = [...SIGNATURE_FIELD_TYPES, ...PREPOPULATED_FIELD_TYPES];
    const fieldConfig = allFieldTypes.find(f => f.type === selectedFieldType);
    if (!fieldConfig) return;
    
    const isPrepopulated = PREPOPULATED_FIELD_TYPES.some(f => f.type === selectedFieldType);
    const value = isPrepopulated ? getFieldValue(selectedFieldType, quote) : undefined;
    
    const clampedX = Math.max(0, Math.min(x, pdfDimensions.width - fieldConfig.width));
    const clampedY = Math.max(0, Math.min(y, pdfDimensions.height - fieldConfig.height));
    
    const newField: FieldData = {
      signerId: signers[selectedSignerIndex].id!,
      pageNumber: currentPage,
      fieldType: selectedFieldType,
      x: clampedX,
      y: clampedY,
      width: fieldConfig.width,
      height: fieldConfig.height,
      value
    };
    
    setFields(prev => [...prev, newField]);
    setSelectedFieldType(null);
  };

  const updateField = (index: number, updates: Partial<FieldData>) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const currentPageFields = fields.filter(f => f.pageNumber === currentPage);
  const scaledWidth = pdfDimensions.width * pdfScale;
  const scaledHeight = pdfDimensions.height * pdfScale;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Send Quote for Signature
          </DialogTitle>
        </DialogHeader>

        <Tabs value={step} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="upload" disabled={step !== "upload" && !documentId}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="signers" disabled={!documentId}>
              <Users className="w-4 h-4 mr-2" />
              Signers
            </TabsTrigger>
            <TabsTrigger value="fields" disabled={signers.length === 0}>
              <FileText className="w-4 h-4 mr-2" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="send" disabled={fields.length === 0}>
              <Send className="w-4 h-4 mr-2" />
              Send
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex-1 overflow-auto p-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div 
                    className="border-2 border-dashed rounded-lg p-8 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="upload-area"
                  >
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Click to upload PDF</p>
                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="file-input"
                    />
                  </div>
                  
                  {pdfData && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <Check className="w-5 h-5" />
                        <span>{fileName}</span>
                      </div>
                      <div className="border rounded-lg overflow-hidden max-h-[300px]">
                        <PDFDocument file={pdfData} onLoadSuccess={onDocumentLoadSuccess}>
                          <PDFPage pageNumber={1} width={400} />
                        </PDFDocument>
                      </div>
                      <Button 
                        onClick={handleUploadSubmit} 
                        disabled={createDocumentMutation.isPending}
                        data-testid="button-upload-continue"
                      >
                        {createDocumentMutation.isPending ? "Uploading..." : "Continue"}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signers" className="flex-1 overflow-auto p-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Signer Name"
                    value={newSignerName}
                    onChange={(e) => setNewSignerName(e.target.value)}
                    data-testid="input-signer-name"
                  />
                  <Input
                    placeholder="Email Address"
                    type="email"
                    value={newSignerEmail}
                    onChange={(e) => setNewSignerEmail(e.target.value)}
                    data-testid="input-signer-email"
                  />
                  <Button onClick={handleAddSigner} disabled={addSignerMutation.isPending} data-testid="button-add-signer">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {signers.map((signer, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`signer-${i}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: signer.color }} />
                        <div>
                          <p className="font-medium">{signer.name}</p>
                          <p className="text-sm text-muted-foreground">{signer.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signer.id && deleteSignerMutation.mutate(signer.id)}
                        data-testid={`delete-signer-${i}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {signers.length > 0 && (
                  <Button onClick={() => setStep("fields")} data-testid="button-signers-continue">
                    Continue to Place Fields
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="flex-1 overflow-hidden p-4">
            <div className="flex gap-4 h-full">
              <div className="w-64 space-y-4 overflow-auto">
                <div>
                  <Label className="text-sm font-medium">Select Signer</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {signers.map((signer, i) => (
                      <Badge
                        key={i}
                        variant={selectedSignerIndex === i ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedSignerIndex(i)}
                        style={selectedSignerIndex === i ? { backgroundColor: signer.color } : { borderColor: signer.color, color: signer.color }}
                        data-testid={`select-signer-${i}`}
                      >
                        {signer.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Signature Fields</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {SIGNATURE_FIELD_TYPES.map(ft => (
                      <Button
                        key={ft.type}
                        variant={selectedFieldType === ft.type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedFieldType(selectedFieldType === ft.type ? null : ft.type)}
                        className="text-xs"
                        data-testid={`field-type-${ft.type}`}
                      >
                        {ft.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Data Fields</Label>
                  <div className="grid grid-cols-1 gap-1 mt-2 max-h-[200px] overflow-auto">
                    {PREPOPULATED_FIELD_TYPES.map(ft => {
                      const value = getFieldValue(ft.type, quote);
                      return (
                        <Button
                          key={ft.type}
                          variant={selectedFieldType === ft.type ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedFieldType(selectedFieldType === ft.type ? null : ft.type)}
                          className="text-xs justify-start h-auto py-1"
                          data-testid={`field-type-${ft.type}`}
                        >
                          <span className="truncate">{ft.label}: {value || '—'}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    {selectedFieldType 
                      ? `Click on the PDF to place a ${selectedFieldType} field`
                      : "Select a field type, then click on the PDF to place it"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag fields to reposition. Resize using bottom-right corner.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPdfScale(s => Math.max(0.5, s - 0.1))}
                    data-testid="zoom-out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">{Math.round(pdfScale * 100)}%</span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPdfScale(s => Math.min(2, s + 0.1))}
                    data-testid="zoom-in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="pt-2">
                  <Badge variant="secondary">{fields.length} field(s) placed</Badge>
                </div>
                
                <Button 
                  onClick={() => saveFieldsMutation.mutate()} 
                  disabled={fields.length === 0 || saveFieldsMutation.isPending}
                  className="w-full"
                  data-testid="button-save-fields"
                >
                  {saveFieldsMutation.isPending ? "Saving..." : "Save & Continue"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-auto border rounded-lg bg-slate-100">
                <div className="p-4">
                  {pageCount > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        data-testid="prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm">Page {currentPage} of {pageCount}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= pageCount}
                        onClick={() => setCurrentPage(p => p + 1)}
                        data-testid="next-page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div 
                    ref={pdfContainerRef}
                    className="relative inline-block"
                    onClick={handlePdfClick}
                    style={{ 
                      cursor: selectedFieldType ? 'crosshair' : 'default',
                      width: scaledWidth,
                      height: scaledHeight
                    }}
                    data-testid="pdf-container"
                  >
                    {pdfData ? (
                      <PDFDocument file={pdfData}>
                        <PDFPage 
                          pageNumber={currentPage} 
                          scale={pdfScale}
                          onLoadSuccess={onPageLoadSuccess}
                        />
                      </PDFDocument>
                    ) : (
                      <div className="flex items-center justify-center text-slate-400 w-full h-full">
                        <div className="text-center">
                          <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                          <p>PDF Preview Area</p>
                        </div>
                      </div>
                    )}
                    
                    <div 
                      className="absolute top-0 left-0"
                      style={{ 
                        width: scaledWidth, 
                        height: scaledHeight,
                        pointerEvents: 'none',
                        transform: `scale(${pdfScale})`,
                        transformOrigin: 'top left'
                      }}
                    >
                      <div style={{ pointerEvents: 'auto' }}>
                        {currentPageFields.map((field, i) => {
                          const globalIndex = fields.findIndex(f => f === field);
                          const signer = signers.find(s => s.id === field.signerId);
                          return (
                            <DraggableField
                              key={globalIndex}
                              field={field}
                              index={globalIndex}
                              signer={signer}
                              onUpdate={updateField}
                              onRemove={removeField}
                              containerWidth={pdfDimensions.width}
                              containerHeight={pdfDimensions.height}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="send" className="flex-1 overflow-auto p-4">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center space-y-2">
                  <Mail className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="text-xl font-semibold">Ready to Send</h3>
                  <p className="text-muted-foreground">
                    Your document will be sent to {signers.length} signer(s) for signature
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>From (Sender Name)</Label>
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your name or company"
                    data-testid="input-sender-name"
                  />
                </div>
                
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">Recipients:</h4>
                  {signers.map((signer, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: signer.color }} />
                      <span>{signer.name}</span>
                      <span className="text-muted-foreground">({signer.email})</span>
                    </div>
                  ))}
                </div>
                
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">Fields to Complete:</h4>
                  <p className="text-sm text-muted-foreground">
                    {fields.length} field(s) across {pageCount} page(s)
                  </p>
                </div>
                
                <Button 
                  onClick={() => sendDocumentMutation.mutate()} 
                  disabled={sendDocumentMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-send-document"
                >
                  {sendDocumentMutation.isPending ? "Sending..." : "Send for Signature"}
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
