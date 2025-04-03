import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTimeOnly, formatDuration } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";

type AdminVisitHistoryProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

export function AdminVisitHistory({ visitHistory, isLoading }: AdminVisitHistoryProps) {
  if (isLoading) {
    return <div className="py-4 text-center">Loading visit history...</div>;
  }

  if (visitHistory.length === 0) {
    return <div className="py-4 text-center">No visit history available.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Visitor</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Purpose</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitHistory.map(({ visitor, visit }) => (
            <TableRow key={visit.id}>
              <TableCell>
                <div className="font-medium">{visitor.fullName}</div>
                <div className="text-sm text-gray-500">{visitor.email || "No email provided"}</div>
              </TableCell>
              <TableCell>{visit.host}</TableCell>
              <TableCell>
                <div className="text-sm">{formatTimeOnly(visit.checkInTime)}</div>
                <div className="text-xs text-gray-500">
                  {formatDate(visit.checkInTime).split(',')[0]}
                </div>
              </TableCell>
              <TableCell>
                {visit.checkOutTime ? (
                  <>
                    <div className="text-sm">{formatTimeOnly(visit.checkOutTime)}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(visit.checkOutTime).split(',')[0]}
                    </div>
                  </>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>
                {visit.checkOutTime ? (
                  formatDuration(visit.checkInTime, visit.checkOutTime)
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {visit.purpose === "other" ? visit.otherPurpose : visit.purpose}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
