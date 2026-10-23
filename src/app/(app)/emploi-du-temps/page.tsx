import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TimetableView } from "./timetable-view";

export const metadata = { title: "Emploi du temps" };

export default function TimetablePage() {
  return (
    <>
      <PageHeader
        title="Emploi du temps"
        description="Planning hebdomadaire des seances par classe ou par enseignant"
        icon={<CalendarDays className="h-5 w-5" />}
      />
      <TimetableView />
    </>
  );
}
