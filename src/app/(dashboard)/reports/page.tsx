'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, ArrowDownRight, Users, DollarSign, Target, CheckCircle } from "lucide-react";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

interface ReportData {
  metrics: {
    totalValue: string;
    valueChange: number;
    completedTasks: number;
    tasksChange: number;
    totalClients: number;
    clientsChange: number;
    wonOpportunities: number;
    wonChange: number;
  };
  charts: {
    opportunityStages: Record<string, number>;
    taskStatus: Record<string, number>;
  };
}

function MetricCard({ title, value, change, icon }: MetricCardProps) {
  const isPositive = change >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {Math.abs(change)}% vs last month
        </p>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [opportunitiesRes, tasksRes, clientsRes, interactionsRes] = await Promise.all([
          fetch('/api/data/Opportunite'),
          fetch('/api/data/Task'),
          fetch('/api/data/Client'),
          fetch('/api/data/Interaction')
        ]);

        const [opportunities, tasks, clients, interactions] = await Promise.all([
          opportunitiesRes.json(),
          tasksRes.json(),
          clientsRes.json(),
          interactionsRes.json()
        ]);

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Calculate metrics
        const activeOpportunities = (opportunities || []).filter((o: any) => 
          o && o.etape !== 'Perdue' && o.etape !== 'Clôturé'
        );

        const totalValue = activeOpportunities.reduce((sum: number, o: any) => {
          const v = typeof o.valeur === 'string' ? parseFloat(o.valeur) : (typeof o.valeur === 'number' ? o.valeur : parseFloat(String(o.valeur || 0)));
          return sum + (isNaN(v) ? 0 : v);
        }, 0);

        const lastMonthTotalValue = activeOpportunities
          .filter((o: any) => o.date_creation && new Date(o.date_creation) < lastMonth)
          .reduce((sum: number, o: any) => {
            const v = typeof o.valeur === 'string' ? parseFloat(o.valeur) : (typeof o.valeur === 'number' ? o.valeur : parseFloat(String(o.valeur || 0)));
            return sum + (isNaN(v) ? 0 : v);
          }, 0);

        const valueChange = lastMonthTotalValue ? 
          ((totalValue - lastMonthTotalValue) / lastMonthTotalValue) * 100 : 0;

        const safeTasks = Array.isArray(tasks) ? tasks : [];
        const completedTasks = safeTasks.filter((t: any) => t.statut === 'Terminée').length;
        const lastMonthCompletedTasks = safeTasks.filter((t: any) => 
          t.statut === 'Terminée' && t.date_creation && new Date(t.date_creation) < lastMonth
        ).length;

        const tasksChange = lastMonthCompletedTasks ? 
          ((completedTasks - lastMonthCompletedTasks) / lastMonthCompletedTasks) * 100 : 0;

        const safeClients = Array.isArray(clients) ? clients : [];
        const totalClients = safeClients.length;
        // Beaucoup de schémas client n'ont pas de date_creation; si absente, on fixe le delta à 0
        const lastMonthClients = safeClients.filter((c: any) => c.date_creation && new Date(c.date_creation) < lastMonth).length;

        const clientsChange = lastMonthClients ? 
          ((totalClients - lastMonthClients) / lastMonthClients) * 100 : 0;

        const wonOpportunities = opportunities.filter((o: any) => o.etape === 'Gagnée').length;
        const lastMonthWonOpportunities = opportunities.filter((o: any) => 
          o.etape === 'Gagnée' && new Date(o.date_creation) < lastMonth
        ).length;

        const wonChange = lastMonthWonOpportunities ? 
          ((wonOpportunities - lastMonthWonOpportunities) / lastMonthWonOpportunities) * 100 : 0;

        // Prepare charts data
        const opportunityStages = (opportunities || []).reduce((acc: any, o: any) => {
          acc[o.etape] = (acc[o.etape] || 0) + 1;
          return acc;
        }, {});

        const taskStatus = safeTasks.reduce((acc: any, t: any) => {
          const key = t.statut || 'Inconnu';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        setData({
          metrics: {
            totalValue: totalValue.toFixed(2),
            valueChange,
            completedTasks,
            tasksChange,
            totalClients,
            clientsChange,
            wonOpportunities,
            wonChange
          },
          charts: {
            opportunityStages,
            taskStatus
          }
        });
      } catch (error) {
        console.error('Failed to fetch report data:', error);
        toast({
          title: "Error",
          description: "Failed to load report data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const { metrics, charts } = data;

  const sumValues = (obj: Record<string, number>): number => {
    return Object.values(obj).reduce((a, b) => a + b, 0);
  };

  const totalOpportunities = sumValues(charts.opportunityStages);
  const totalTasks = sumValues(charts.taskStatus);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Performance Dashboard</CardTitle>
          <CardDescription>Key metrics and insights</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pipeline Value"
          value={`€${metrics.totalValue}`}
          change={metrics.valueChange}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Completed Tasks"
          value={String(metrics.completedTasks)}
          change={metrics.tasksChange}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Total Clients"
          value={String(metrics.totalClients)}
          change={metrics.clientsChange}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Won Opportunities"
          value={String(metrics.wonOpportunities)}
          change={metrics.wonChange}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
            <CardDescription>Distribution of opportunities by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              className="h-[300px]"
              config={{
                opportunities: { theme: { light: "#6366f1", dark: "#6366f1" } }
              }}
            >
              <BarChart
                data={Object.entries(charts.opportunityStages).map(([stage, value]) => ({
                  stage,
                  value
                }))}
              >
                <XAxis dataKey="stage" />
                <YAxis />
                <Bar 
                  dataKey="value" 
                  fill="var(--color-opportunities)" 
                  radius={[4, 4, 0, 0]}
                />
                <ChartTooltip />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status</CardTitle>
            <CardDescription>Current task distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px]"
              config={{
                tasks: { theme: { light: "#6366f1", dark: "#6366f1" } },
                completed: { theme: { light: "#22c55e", dark: "#22c55e" } },
                pending: { theme: { light: "#ef4444", dark: "#ef4444" } },
                inProgress: { theme: { light: "#f59e0b", dark: "#f59e0b" } }
              }}
            >
              <PieChart>
                <Pie
                  data={Object.entries(charts.taskStatus).map(([status, value]) => ({
                    status,
                    value
                  }))}
                  dataKey="value"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  <Cell fill="var(--color-tasks)" />
                  <Cell fill="var(--color-completed)" />
                  <Cell fill="var(--color-pending)" />
                  <Cell fill="var(--color-inProgress)" />
                </Pie>
                <ChartTooltip />
                <ChartLegend verticalAlign="bottom" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
          <CardDescription>In-depth reports and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="opportunities">
            <TabsList>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
            </TabsList>
            <TabsContent value="opportunities">
              <div className="rounded-md border p-4">
                <h4 className="text-sm font-semibold mb-4">Opportunity Insights</h4>
                <ul className="space-y-2">
                  <li>Total opportunities: {totalOpportunities}</li>
                  <li>Win rate: {((metrics.wonOpportunities / totalOpportunities) * 100).toFixed(1)}%</li>
                  <li>Average deal value: €{(Number(metrics.totalValue) / totalOpportunities).toFixed(2)}</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="tasks">
              <div className="rounded-md border p-4">
                <h4 className="text-sm font-semibold mb-4">Task Analysis</h4>
                <ul className="space-y-2">
                  <li>Total tasks: {totalTasks}</li>
                  <li>Completion rate: {((metrics.completedTasks / totalTasks) * 100).toFixed(1)}%</li>
                  <li>Active tasks: {totalTasks - metrics.completedTasks}</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="clients">
              <div className="rounded-md border p-4">
                <h4 className="text-sm font-semibold mb-4">Client Statistics</h4>
                <ul className="space-y-2">
                  <li>Total clients: {metrics.totalClients}</li>
                  <li>Growth rate: {metrics.clientsChange.toFixed(1)}%</li>
                  <li>Average opportunities per client: {(totalOpportunities / metrics.totalClients).toFixed(1)}</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
