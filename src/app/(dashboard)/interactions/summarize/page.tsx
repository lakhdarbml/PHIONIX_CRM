
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const mockReport = `
### Global Summary
A total of 5 interactions were logged recently. The general sentiment is positive, with significant progress on the Alpha project.

### Key Themes & Trends
1.  **Alpha Project Finalization:** Multiple interactions focus on finalizing the proposal for the Alpha project. The client seems engaged and ready to move forward.
2.  **Beta Project Discovery:** The initial discovery and demo for the Beta project have been completed. The client showed strong interest but has some questions about implementation.
3.  **Support Questions:** A few minor support questions were resolved quickly, indicating good customer support engagement.

### Actionable Insights & Recommendations
*   **Alpha Project:** Prioritize sending the final proposal to client Alpha. Follow up within 2 business days.
*   **Beta Project:** Schedule a follow-up technical call with client Beta to address their implementation questions. Prepare a more detailed technical document.
*   **Team Sync:** Schedule a brief internal meeting to ensure sales and support teams are aligned on the status of both Alpha and Beta projects.
`;


export default function SummarizeInteractionPage() {
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSummarize = async () => {
    setIsLoading(true);
    setError('');
    setReport('');
    try {
      // In a real app, you'd fetch these. Here we use mock data.
      await new Promise(resolve => setTimeout(resolve, 1500));
      setReport(mockReport);
    } catch (e: any) {
      setError('Failed to generate report. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/interactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Interaction Report</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generate AI-Powered Interaction Report</CardTitle>
          <CardDescription>
            Click the button below to analyze all recent customer interactions and generate an actionable report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!report && !isLoading && (
             <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                <div className="text-center">
                    <h3 className="text-lg font-semibold">Ready to analyze?</h3>
                    <p className="text-sm text-muted-foreground">Generate a report to uncover trends and insights.</p>
                     <Button onClick={handleSummarize} disabled={isLoading} className="mt-4">
                        {isLoading ? 'Generating...' : <> <Sparkles className="mr-2 h-4 w-4" /> Generate Report</>}
                    </Button>
                </div>
            </div>
          )}

          {isLoading && (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Sparkles className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing interactions and generating your report...</p>
              </div>
            </div>
          )}
          
          {report && (
            <div className="grid gap-2">
              <Label>Generated Report</Label>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md border bg-muted" dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br />') }} />
            </div>
          )}
           {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
           )}
        </CardContent>
        {report && !isLoading && (
          <CardFooter className="flex justify-end">
            <Button onClick={handleSummarize} disabled={isLoading}>
                {isLoading ? 'Regenerating...' : <> <Sparkles className="mr-2 h-4 w-4" /> Regenerate Report</>}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
