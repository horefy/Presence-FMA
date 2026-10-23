import { UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProfilView } from "./profil-view";

export const metadata = { title: "Mon profil" };

export default function ProfilPage() {
  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Informations du compte, roles, permissions et securite"
        icon={<UserCircle2 className="h-5 w-5" />}
      />
      <ProfilView />
    </>
  );
}
