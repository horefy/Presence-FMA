import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DashboardView } from "./dashboard-view";

export const metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'assiduite et de l'activite de l'etablissement"
        icon={<LayoutDashboard className="h-5 w-5" />}
      />
      <DashboardView />
    </>
  );
}
