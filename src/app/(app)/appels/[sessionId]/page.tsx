import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AppelSheetView } from "./appel-sheet";

type Params = { params: Promise<{ sessionId: string }> };

export default async function AppelSheetPage({ params }: Params) {
  const { sessionId } = await params;
  if (!sessionId) notFound();

  return (
    <>
      <PageHeader
        title="Feuille d'appel"
        description="Saisissez le statut de presence de chaque apprenant"
        icon={<ClipboardCheck className="h-5 w-5" />}
      />
      <AppelSheetView sessionId={sessionId} />
    </>
  );
}
