import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { upsertShift, parseShiftsFromText, clearAllShiftsForUser } from "@/lib/shifts";
import { getCurrentUser } from "@/lib/auth";

const UploadPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedShifts, setExtractedShifts] = useState<Array<{date: string, time: string}>>([]);
  const [processingStep, setProcessingStep] = useState<'upload' | 'extract' | 'save' | 'complete'>('upload');

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
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  const processPDFFile = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Use pdf.js to extract text properly
        const pdfjsLib: any = await import('pdfjs-dist');

        // Prefer a same-origin worker URL resolved by Vite to avoid CORS/mixed-content issues
        try {
          const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
        } catch {
          // Fallback to CDN if bundler URL resolution fails
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.js'
        }

        let pdf
        try {
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        } catch (e) {
          // Final fallback: disable worker usage
          console.warn('pdf.js worker failed to initialize, retrying without worker...')
          pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useWorkerFetch: false }).promise
        }
        let fullText = '';
        
        // Extract text from all pages, preserving line breaks when available
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent: any = await page.getTextContent();
          const items: any[] = textContent.items || [];
          const pageText = items
            .map((item: any) => {
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

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setProcessingStep('extract');
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to upload rosters",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      // Extract text from PDF
      toast({
        title: "Processing...",
        description: "Extracting text from PDF",
      });
      
      const pdfText = await processPDFFile(selectedFile);
      
      // Parse shifts from text
      setProcessingStep('save');
      toast({
        title: "Processing...",
        description: "Parsing shifts from roster",
      });
      
      const shifts = parseShiftsFromText(pdfText);
      setExtractedShifts(shifts);
      
      if (shifts.length === 0) {
        toast({
          title: "No Shifts Found",
          description: "Could not extract any shifts from the PDF. Please check the format or add shifts manually.",
          variant: "destructive"
        });
        return;
      }

      // Clear all existing shifts for this user to prevent duplicates
      toast({
        title: "Clearing existing shifts...",
        description: "Removing old shifts to prevent duplicates",
      });
      
      const { deletedCount } = await clearAllShiftsForUser(user.id);
      console.log(`Cleared ${deletedCount} existing shifts`);

      // Save shifts to database
      toast({
        title: "Processing...",
        description: `Processing ${shifts.length} shifts from your roster`,
      });

      let createdCount = 0;
      let errorCount = 0;

      console.log('Processing shifts:', shifts.length, 'total shifts');
      console.log('User ID:', user.id);

      for (const shift of shifts) {
        try {
          console.log('Processing shift:', shift);
          const result = await upsertShift(shift.date, shift.time, user.id);
          console.log('Upsert result:', result);
          if (result.action === 'created') {
            createdCount++;
          }
        } catch (error) {
          console.error('Failed to process shift:', shift, error);
          errorCount++;
        }
      }

      console.log('Upload summary - Created:', createdCount, 'Errors:', errorCount);
      console.log('All processed shifts:', shifts);

      setProcessingStep('complete');
      
      let description = `Successfully uploaded ${createdCount} shifts`;
      if (errorCount > 0) {
        description += ` (${errorCount} failed to process)`;
      }
      
      toast({
        title: "Success!",
        description: description,
      });

      // Test: Try to fetch shifts immediately after upload to verify they're saved
      setTimeout(async () => {
        try {
          console.log('Testing: Fetching shifts immediately after upload...');
          const testShifts = await getUserShifts(user.id);
          console.log('Immediate fetch result:', testShifts.length, 'shifts found');
          console.log('Immediate fetch data:', testShifts);
        } catch (error) {
          console.error('Error fetching shifts immediately:', error);
        }
      }, 1000);
      
      // Force a complete page reload to ensure calendar refreshes
      setTimeout(() => {
        console.log('Redirecting to dashboard with full reload...');
        window.location.href = '/dashboard';
      }, 3000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process PDF",
        variant: "destructive"
      });
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
                Upload a PDF file containing your flight roster. The system will automatically extract and parse your shifts.
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
                  <p className="text-sm text-muted-foreground">
                    Only PDF files are supported
                  </p>
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

              {selectedFile && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-red-500" />
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleUpload} 
                        disabled={uploading}
                        className="ml-4"
                      >
                        {uploading ? 'Processing...' : 'Upload & Process'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processing Status */}
              {uploading && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <div>
                          <p className="font-medium">Processing PDF...</p>
                          <p className="text-sm text-muted-foreground">
                            {processingStep === 'extract' && 'Extracting text from PDF'}
                            {processingStep === 'save' && 'Parsing and saving shifts'}
                            {processingStep === 'complete' && 'Finalizing...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Extracted Shifts Preview */}
              {extractedShifts.length > 0 && processingStep === 'complete' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Extracted Shifts
                    </CardTitle>
                    <CardDescription>
                      Found {extractedShifts.length} shifts in your roster
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {extractedShifts.slice(0, 10).map((shift, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="font-medium">{new Date(shift.date).toLocaleDateString()}</span>
                          <span className="text-sm">{shift.time}</span>
                        </div>
                      ))}
                      {extractedShifts.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center">
                          ... and {extractedShifts.length - 10} more shifts
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Processing Information
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      The system will automatically extract shift information including dates, times, and locations from your PDF roster.
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