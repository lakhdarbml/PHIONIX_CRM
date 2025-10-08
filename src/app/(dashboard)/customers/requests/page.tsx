
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useAuth, type CustomerRequest } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function CustomerRequestsPage() {
  const { getPendingRequests, approveRequest, rejectRequest } = useAuth();
  const { toast } = useToast();
  // Use state to manage requests to re-render on change
  const [requests, setRequests] = useState<CustomerRequest[]>(getPendingRequests());

  useEffect(() => {
    setRequests(getPendingRequests());
  }, [getPendingRequests, requests]);


  const handleApprove = async (request: CustomerRequest) => {
    try {
        await approveRequest(request);
        toast({
        title: "Request Approved",
        description: `${request.name} has been approved and a customer account has been created.`,
        });
        setRequests(getPendingRequests()); // Refresh the list
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Approval Failed",
            description: "Could not approve the request. Check console for errors.",
        });
        console.error(e);
    }
  };
  
  const handleReject = (request: CustomerRequest) => {
    rejectRequest(request);
    toast({
        variant: "destructive",
        title: "Request Rejected",
        description: `${request.name}'s sign-up request has been rejected.`,
    });
     setRequests(getPendingRequests()); // Refresh the list
  };

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Customer Requests</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Customer Requests</CardTitle>
          <CardDescription>Review and approve new customer sign-ups.</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length > 0 ? (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map((request) => (
                        <TableRow key={request.email}>
                            <TableCell className="font-medium">{request.name}</TableCell>
                            <TableCell>{request.email}</TableCell>
                            <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleApprove(request)}>
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleReject(request)}>
                                     <X className="mr-2 h-4 w-4" />
                                    Reject
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">No pending customer requests.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
