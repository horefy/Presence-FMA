import * as React from "react";
import {
  Bell,
  BookOpen,
  Briefcase,
  Building,
  CalendarClock,
  CalendarDays,
  CalendarHeart,
  CalendarOff,
  CalendarRange,
  ChartColumnBig,
  ClipboardCheck,
  Clock,
  DoorOpen,
  FileCheck,
  FilePen,
  Files,
  GraduationCap,
  IdCard,
  KeyRound,
  KeySquare,
  Layers,
  Link2,
  MapPin,
  Network,
  Paperclip,
  PartyPopper,
  PenLine,
  Presentation,
  RefreshCw,
  Route,
  School,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/** Correspondance nom d'icone (registre) -> composant lucide. */
export const ICONS: Record<string, LucideIcon> = {
  Bell,
  BookOpen,
  Briefcase,
  Building,
  CalendarClock,
  CalendarDays,
  CalendarHeart,
  CalendarOff,
  CalendarRange,
  ChartColumnBig,
  ClipboardCheck,
  Clock,
  DoorOpen,
  FileCheck,
  FilePen,
  Files,
  GraduationCap,
  IdCard,
  KeyRound,
  KeySquare,
  Layers,
  Link2,
  MapPin,
  Network,
  Paperclip,
  PartyPopper,
  PenLine,
  Presentation,
  RefreshCw,
  Route,
  School,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Layers;
}

/** Composant d'icone pour une cle du registre (memoise : pas de component cree au render). */
export const ResourceIcon = React.memo(function ResourceIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = getIcon(name);
  return <Icon className={className} />;
});
