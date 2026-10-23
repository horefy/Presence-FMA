import { Badge } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { statusMeta } from "@/components/status";
import { detailGroups, fieldDisplayValue } from "@/lib/display";
import type { ResourceDef } from "@/lib/registry";
import { formatDate, formatDateTime } from "@/lib/utils";

/** Vue en lecture seule d'un enregistrement. */
export function ResourceDetailView({
  resource,
  row,
}: {
  resource: ResourceDef;
  row: Record<string, unknown>;
}) {
  const groups = detailGroups(resource).filter((g) =>
    g.fields.some((f) => !f.readonly),
  );

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <Card key={group.name}>
          <CardHeader title={group.name} />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
              {group.fields
                .filter((f) => !f.readonly)
                .map((field) => {
                  const value = fieldDisplayValue(resource, field, row);
                  const isStatus =
                    field.type === "select" &&
                    (field.name === "status" || field.name.endsWith("Status"));
                  return (
                    <div key={field.name} className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {field.label}
                      </dt>
                      <dd className="mt-1 break-words text-sm text-slate-800">
                        {isStatus && value !== "—" ? (
                          <Badge tone={statusMeta(row[field.name]).tone}>{value}</Badge>
                        ) : field.type === "datetime" ? (
                          formatDateTime(row[field.name] as string)
                        ) : field.type === "date" ? (
                          formatDate(row[field.name] as string)
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  );
                })}
            </dl>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
