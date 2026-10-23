import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AppelsView } from "./appels-view";

export const metadata = { title: "Feuilles d'appel" };

export default function AppelsPage() {
  return (
    <>
      <PageHeader
        title="Feuilles d'appel"
        description="Selectionnez une seance pour saisir les presences des apprenants"
        icon={<ClipboardCheck className="h-5 w-5" />}
      />
      <AppelsView />
    </>
  );
}
