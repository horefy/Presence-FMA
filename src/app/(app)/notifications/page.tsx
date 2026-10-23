import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { NotificationsView } from "./notifications-view";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alertes, demandes et messages a votre attention"
        icon={<Bell className="h-5 w-5" />}
      />
      <NotificationsView />
    </>
  );
}
