import { ChartColumnBig } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RapportsView } from "./rapports-view";

export const metadata = { title: "Rapports et statistiques" };

export default function RapportsPage() {
  return (
    <>
      <PageHeader
        title="Rapports et statistiques"
        description="Analyses d'assiduite des apprenants et du personnel"
        icon={<ChartColumnBig className="h-5 w-5" />}
      />
      <RapportsView />
    </>
  );
}
