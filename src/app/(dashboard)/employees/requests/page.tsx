
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTitle, DialogDescription, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';

interface EmployeeRequest {
  id: number;
  employeeName: string;
  role: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
}

export default function EmployeeRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [approvingReq, setApprovingReq] = useState<EmployeeRequest|null>(null);
  const [modPass, setModPass] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/employe/requests');
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const transformedRequests = data.map((emp: any) => ({
          id: emp.id_personne,
          employeeName: `${emp.nom} ${emp.prenom}`,
          role: emp.role,
          department: emp.departement,
          status: emp.status === 'inactif' ? 'pending' : emp.status,
          requestDate: emp.date_creation
        }));
        setRequests(transformedRequests);
      } else {
        throw new Error('Failed to fetch requests');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load employee requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/employe/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          status: action === 'approve' ? 'actif' : 'inactif'
        }),
      });

      if (response.ok) {
        await fetchRequests();
        toast({
          title: "Success",
          description: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        });
      } else {
        throw new Error(`Failed to ${action} request`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} request`,
        variant: "destructive",
      });
    }
  };

  function handleApproveClicked(req:EmployeeRequest) {
    setApprovingReq(req);
    setValidateModalOpen(true);
    setModPass(''); setShowPass(false); setCopied(false);
  }
  function randomPassword() {
    return Array(12).fill(0).map(()=>String.fromCharCode(33+Math.floor(Math.random()*94))).join('');
  }
  async function handleApproveModalSubmit(e:any) {
    e.preventDefault();
    if (!modPass.trim()) { toast({ title:'Mot de passe requis'}); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/employe/requests/${approvingReq!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status:'actif', user_id:1, password:modPass })
      });
      if (response.ok) {
        setShowPass(true); setValidateModalOpen(false);
        toast({ title: "Success", description:"Employé validé. À communiquer : "+modPass });
        await fetchRequests();
      } else {
        const err=await response.json().catch(()=>({}));
        toast({ title:'Erreur', description:err.error||'Erreur validation',variant:'destructive'});
      }
    } finally { setIsSubmitting(false); }
  }

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
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
              <p className="text-muted-foreground">No pending requests.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employeeName}</TableCell>
                    <TableCell>{request.role}</TableCell>
                    <TableCell>{request.department}</TableCell>
                    <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproveClicked(request)}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestAction(request.id, 'reject')}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={validateModalOpen} onOpenChange={setValidateModalOpen}>
        <DialogContent>
          <form onSubmit={handleApproveModalSubmit}>
            <DialogHeader>
              <DialogTitle>Activer l'employé</DialogTitle>
              <DialogDescription>Définir un mot de passe initial, ou générer aléatoirement.</DialogDescription>
            </DialogHeader>
            <Input 
              placeholder="Mot de passe initial"
              value={modPass}
              type="text"
              onChange={e=>setModPass(e.target.value)}
              required
              className="mb-2"
              disabled={isSubmitting}
            />
            <Button type="button" variant="outline" onClick={()=>setModPass(randomPassword())} disabled={isSubmitting} className="mb-2">Générer un mot de passe aléatoire</Button>
            {modPass && (
              <div className="flex items-center mb-2">
                <span className="mr-2 text-xs text-gray-500">Mot de passe à communiquer :</span>
                <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded text-gray-900">{modPass}</span>
                <Button type="button" size="icon" variant="ghost" className="ml-2" onClick={()=>{navigator.clipboard.writeText(modPass);setCopied(true);setTimeout(()=>setCopied(false),1200);}}>{copied?"Copié !":<Copy className="h-4 w-4" />}</Button>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>Valider & Activer</Button>
              <Button type="button" variant="outline" onClick={()=>setValidateModalOpen(false)} disabled={isSubmitting}>Annuler</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
