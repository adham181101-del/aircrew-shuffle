import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateShifts } from "@/hooks/useShifts";
import { CircularProgress } from "@/components/ui/circular-progress";
import { upsertShift, parseShiftsFromText, clearAllShiftsForUser, getUserShifts } from "@/lib/shifts";
import { parseLeaveDaysFromText, replaceAllLeaveDaysForUser, getMyLeaveDays } from "@/lib/leave";
import { getCurrentUser } from "@/lib/auth";
import {
  computeRosterDiff,
  dedupeShiftsByDate,
  formatRosterDiffSummary,
  formatShiftDate,
  rosterDiffHasChanges,
  type RosterDiff,
} from "@/lib/rosterDiff";

type ProcessingStep = 'upload' | 'extract' | 'preview' | 'save' | 'complete';

const UploadPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const invalidateShifts = useInvalidateShifts();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedShifts, setExtractedShifts] = useState<Array<{date: string, time: string}>>([]);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('upload');
  const [rosterDiff, setRosterDiff] = useState<RosterDiff | null>(null);
  const [pendingPdfShifts, setPendingPdfShifts] = useState<Array<{ date: string; time: string }>>([]);
  const [pendingLeaveDates, setPendingLeaveDates] = useState<string[]>([]);

  const resetPreview = () => {
    setRosterDiff(null);
    setPendingPdfShifts([]);
    setPendingLeaveDates([]);
    setProcessingStep('upload');
    setExtractedShifts([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files[0]?.type === 'application/pdf') {
      setSelectedFile(files[0]);
      resetPreview();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') {
      setSelectedFile(file);
      resetPreview();
    }
  };

  const processPDFFile = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib: {
          GlobalWorkerOptions: { workerSrc: string };
          getDocument: (opts: object) => { promise: Promise<{ numPages: number }> };
        } = await import('pdfjs-dist');

        try {
          const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.js';
        }

        let pdf;
        try {
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        } catch {
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useWorkerFetch: false }).promise;
        }

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await (pdf as { getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string; hasEOL?: boolean }> }> }> }).getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items || [];
          const pageText = items
            .map((item) => {
              const str = item?.str ?? '';
              const suffix = item?.hasEOL ? '\n' : ' ';
              return str + suffix;
            })
            .join('')
            .replace(/[ \t]+\n/g, '\n');
          fullText += pageText + '\n';
        }

        resolve(fullText);
      } catch (error) {
        console.error('PDF processing error:', error);
        reject(new Error('Failed to extract text from PDF'));
      }
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProcessingStep('extract');
    setUploadProgress(5);
    setProgressLabel('Reading PDF…');
    resetPreview();

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to upload rosters",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      setUploadProgress(35);
      setProgressLabel('Extracting text…');
      const pdfText = await processPDFFile(selectedFile);
      setUploadProgress(55);
      setProgressLabel('Parsing shifts…');
      const shifts = parseShiftsFromText(pdfText);
      const leaveDates = parseLeaveDaysFromText(pdfText);
      const uniquePdfShifts = dedupeShiftsByDate(shifts);

      if (uniquePdfShifts.length === 0 && leaveDates.length === 0) {
        toast({
          title: "No Roster Data Found",
          description: "Could not extract shifts or leave days from the PDF.",
          variant: "destructive",
        });
        return;
      }

      setUploadProgress(75);
      setProgressLabel('Comparing with your roster…');
      const existingShifts = await getUserShifts(user.id);
      const existingLeave = await getMyLeaveDays();

      const diff = computeRosterDiff(
        existingShifts.map((s) => ({ date: s.date, time: s.time })),
        uniquePdfShifts,
        existingLeave.map((l) => l.date),
        leaveDates
      );

      setExtractedShifts(uniquePdfShifts);
      setPendingPdfShifts(uniquePdfShifts);
      setPendingLeaveDates(leaveDates);
      setRosterDiff(diff);
      setProcessingStep('preview');
      setUploadProgress(100);
      setProgressLabel('');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process PDF",
        variant: "destructive",
      });
      setProcessingStep('upload');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!pendingPdfShifts.length && !pendingLeaveDates.length) return;

    setUploading(true);
    setProcessingStep('save');
    setUploadProgress(10);
    setProgressLabel('Clearing old roster…');

    try {
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }

      await clearAllShiftsForUser(user.id);
      setUploadProgress(25);
      setProgressLabel('Syncing leave days…');
      const { insertedCount: insertedLeaveCount } = await replaceAllLeaveDaysForUser(
        user.id,
        pendingLeaveDates
      );

      let createdCount = 0;
      let errorCount = 0;
      const total = pendingPdfShifts.length;

      for (let i = 0; i < pendingPdfShifts.length; i++) {
        const shift = pendingPdfShifts[i];
        setProgressLabel(`Saving shifts (${i + 1}/${total})…`);
        setUploadProgress(25 + Math.round(((i + 1) / Math.max(total, 1)) * 70));
        try {
          const result = await upsertShift(shift.date, shift.time, user.id);
          if (result.action === 'created' || result.action === 'updated') {
            createdCount++;
          }
        } catch {
          errorCount++;
        }
      }

      setUploadProgress(98);
      setProgressLabel('Refreshing calendar…');
      await invalidateShifts.mutateAsync();

      setProcessingStep('complete');
      setUploadProgress(100);
      setProgressLabel('Done');

      const summary = rosterDiff ? formatRosterDiffSummary(rosterDiff) : 'Roster updated';
      toast({
        title: "Roster updated",
        description: `${summary}. ${createdCount} shift(s) saved, ${insertedLeaveCount} leave day(s).`,
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save roster",
        variant: "destructive",
      });
      setProcessingStep('preview');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Upload Roster PDF</h1>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload Your Roster
              </CardTitle>
              <CardDescription>
                Upload a PDF roster. You will see what changed before anything is overwritten.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Drop your PDF file here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">Only PDF files are supported</p>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="mt-4" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>

              {selectedFile && processingStep !== 'preview' && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-8 w-8 text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleAnalyze}
                        disabled={uploading}
                        className="shrink-0"
                      >
                        {uploading ? 'Analysing…' : 'Analyse roster'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploading && processingStep !== 'preview' && (
                <Card>
                  <CardContent className="pt-6 flex flex-col items-center gap-4">
                    <CircularProgress
                      value={uploadProgress}
                      label={progressLabel || (processingStep === 'save' ? 'Applying changes…' : 'Processing PDF…')}
                    />
                  </CardContent>
                </Card>
              )}

              {rosterDiff && processingStep === 'preview' && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Review changes</CardTitle>
                    <CardDescription className="text-base font-medium text-foreground">
                      {formatRosterDiffSummary(rosterDiff)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(rosterDiff.changed.length > 0 ||
                      rosterDiff.added.length > 0 ||
                      rosterDiff.removed.length > 0) && (
                      <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border bg-white p-3 text-sm">
                        {rosterDiff.changed.map((c) => (
                          <div key={c.date} className="flex justify-between gap-2">
                            <span className="font-medium">{formatShiftDate(c.date)}</span>
                            <span className="text-muted-foreground text-right">
                              {c.fromTime} → {c.toTime}
                            </span>
                          </div>
                        ))}
                        {rosterDiff.added.map((a) => (
                          <div key={a.date} className="flex justify-between gap-2 text-green-800">
                            <span className="font-medium">+ {formatShiftDate(a.date)}</span>
                            <span>{a.time}</span>
                          </div>
                        ))}
                        {rosterDiff.removed.map((r) => (
                          <div key={r.date} className="flex justify-between gap-2 text-red-800">
                            <span className="font-medium">− {formatShiftDate(r.date)}</span>
                            <span>{r.time}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!rosterDiffHasChanges(rosterDiff) && (
                      <p className="text-sm text-muted-foreground">
                        Your uploaded roster matches what is already saved. You can still apply to
                        refresh leave markers and sync from the PDF.
                      </p>
                    )}

                    <p className="text-sm text-amber-900">
                      Applying will replace your saved shifts with this PDF ({pendingPdfShifts.length}{' '}
                      days). This cannot be undone automatically.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={uploading}
                        onClick={() => {
                          resetPreview();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={uploading}
                        onClick={handleConfirmApply}
                      >
                        {uploading ? 'Applying…' : (
                          <>
                            Apply changes
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {extractedShifts.length > 0 && processingStep === 'complete' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Roster saved
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
                  </CardContent>
                </Card>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      How it works
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      We compare the PDF to your current roster first, then you confirm before
                      anything is overwritten.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UploadPage;
