
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  Users,
  CheckSquare,
  Ticket,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "@/context/auth-context";
import { useEffect, useMemo, useState } from "react";

type AnyRow = Record<string, any>;

function monthKey(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<AnyRow[]>([]);
  const [tasks, setTasks] = useState<AnyRow[]>([]);
  const [opps, setOpps] = useState<AnyRow[]>([]);
  const [conversations, setConversations] = useState<AnyRow[]>([]);
  const [participants, setParticipants] = useState<AnyRow[]>([]);
  const [employees, setEmployees] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const endpoints = [
          '/api/data/Client',
          '/api/data/Task',
          '/api/data/Opportunite',
          '/api/data/Conversation',
          '/api/data/Participant',
          '/api/data/Employe',
        ];
        const resps = await Promise.all(endpoints.map((e) => fetch(e)));
        const [c, t, o, conv, part, emp] = await Promise.all(resps.map((r) => r.json()));
        setClients(c || []);
        setTasks(t || []);
        setOpps(o || []);
        setConversations(conv || []);
        setParticipants(part || []);
        setEmployees(emp || []);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const myEmployeId = useMemo(() => {
    if (!user?.personneId) return null;
    const found = employees.find((e) => String(e.id_personne) === String(user.personneId));
    return found ? found.id_employe : null;
  }, [employees, user?.personneId]);

  // KPIs
  const totalRevenue = useMemo(() => {
    return (opps || []).reduce((sum, o) => sum + Number(o.valeur || 0), 0);
  }, [opps]);

  const newCustomers = useMemo(() => {
    return (clients || []).length;
  }, [clients]);

  const today = new Date(); today.setHours(0,0,0,0);
  const tasksDueAll = useMemo(() => {
    const pending = (tasks || []).filter((t) => String(t.statut) !== 'Terminée');
    const due = pending.filter((t) => t.date_echeance ? new Date(t.date_echeance) >= today : false).length;
    const dueToday = pending.filter((t) => {
      if (!t.date_echeance) return false;
      const d = new Date(t.date_echeance); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }).length;
    return { due, dueToday };
  }, [tasks]);

  const myTasksDue = useMemo(() => {
    const mine = (tasks || []).filter((t) => myEmployeId && String(t.id_assigner_a) === String(myEmployeId));
    const pending = mine.filter((t) => String(t.statut) !== 'Terminée');
    const due = pending.filter((t) => t.date_echeance ? new Date(t.date_echeance) >= today : false).length;
    const dueToday = pending.filter((t) => {
      if (!t.date_echeance) return false;
      const d = new Date(t.date_echeance); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }).length;
    return { due, dueToday };
  }, [tasks, myEmployeId]);

  const openTickets = useMemo(() => {
    // Treat conversations not banned as open tickets
    const open = (conversations || []).filter((c) => !(c.is_banned === 1 || c.is_banned === '1')).length;
    return { count: open, urgent: 0 };
  }, [conversations]);

  const myOpenTickets = useMemo(() => {
    if (!user?.personneId) return { count: 0, urgent: 0 };
    const myConvIds = new Set((participants || [])
      .filter((p) => String(p.id_personne) === String(user.personneId))
      .map((p) => String(p.id_conversation))
    );
    const open = (conversations || []).filter((c) => myConvIds.has(String(c.id_conversation)) && !(c.is_banned === 1 || c.is_banned === '1')).length;
    return { count: open, urgent: 0 };
  }, [participants, conversations, user?.personneId]);

  const chartData = useMemo(() => {
    const byMonth = new Map<string, number>();
    (opps || []).forEach((o) => {
      const key = monthKey(o.date_creation);
      if (!key) return;
      byMonth.set(key, (byMonth.get(key) || 0) + Number(o.valeur || 0));
    });
    // Build last 12 months labels
    const now = new Date();
    const months: { name: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleString(undefined, { month: 'short' });
      months.push({ name, total: byMonth.get(key) || 0 });
    }
    return months;
  }, [opps]);

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {isManagerOrAdmin ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground">
                  Revenue (sum of opportunities)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  Total clients
                </p>
              </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasks Due</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{tasksDueAll.due}</div>
                    <p className="text-xs text-muted-foreground">{tasksDueAll.dueToday} due today</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{openTickets.count}</div>
                    <p className="text-xs text-muted-foreground">{openTickets.urgent} urgent</p>
                </CardContent>
            </Card>
          </>
        ) : (
            <>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Tasks Due</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{myTasksDue.due}</div>
                    <p className="text-xs text-muted-foreground">{myTasksDue.dueToday} due today</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Open Tickets</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{myOpenTickets.count}</div>
                    <p className="text-xs text-muted-foreground">{myOpenTickets.urgent} urgent</p>
                </CardContent>
                </Card>
            </>
        )}
      </div>
      {isManagerOrAdmin && (
        <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
              <CardDescription>An overview of your monthly sales.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                  <Tooltip
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                      cursor={{fill: 'hsl(var(--muted))'}}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
