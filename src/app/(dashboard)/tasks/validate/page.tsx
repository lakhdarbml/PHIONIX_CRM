
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ValidateTasksPage() {
  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Validate Tasks</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Task Validation</CardTitle>
          <CardDescription>Review and approve new tasks submitted by managers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
              <p className="text-muted-foreground">Task validation UI coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
