import { PortalDashboardClient } from "@/components/portal/PortalDashboardClient";
import { PortalShell } from "@/components/portal/PortalShell";

export default function PortalDashboardPage() {
  return (
    <PortalShell active="dashboard">
      <PortalDashboardClient />
    </PortalShell>
  );
}
