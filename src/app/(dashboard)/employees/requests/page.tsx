
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EmployeeRequestsPage() {
  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Employee Requests</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Employee Requests</CardTitle>
          <CardDescription>Review and approve new employee requests from managers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
              <p className="text-muted-foreground">Request management UI coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
