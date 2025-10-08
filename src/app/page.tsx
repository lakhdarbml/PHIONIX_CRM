import DashboardLayout from "./(dashboard)/layout";
import Dashboard from "./(dashboard)/page";

export default function RootPage() {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
}
