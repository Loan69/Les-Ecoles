"use client";

import { ReactNode } from "react";
import { PersonneDetail, formatChambre, formatEtage, sortAdminPeople } from "@/lib/adminPeople";

export interface DetailColumn {
  key: string;
  label: string;
  sublabel?: string;
}

interface DetailTableProps {
  people: PersonneDetail[];
  columns: DetailColumn[];
  renderCell: (person: PersonneDetail, columnKey: string) => ReactNode;
}

// Tableau de détail générique et cohérent (présences, repas, chambres…).
// 1re colonne figée. Regroupement par résidence (titre) puis par étage (sous-titre),
// les invitées formant un bloc « Invitées » en fin de chaque résidence.
export default function DetailTable({ people, columns, renderCell }: DetailTableProps) {
  const sorted = sortAdminPeople(people);
  const span = columns.length + 1;

  const rows: ReactNode[] = [];
  let prevRes: string | undefined;
  let prevSection: string | undefined;

  sorted.forEach((p) => {
    if (p.residence !== prevRes) {
      prevRes = p.residence;
      prevSection = undefined;
      rows.push(
        <tr key={`res-${p.residence}`}>
          <th
            colSpan={span}
            className="sticky left-0 bg-blue-100 border border-gray-200 p-1.5 text-left text-xs font-bold uppercase tracking-wide text-blue-900"
          >
            Résidence {p.residence ?? "?"}
          </th>
        </tr>
      );
    }

    const section = p.isInvite ? "Invitées" : formatEtage(p.etage) ?? "Étage non précisé";
    if (section !== prevSection) {
      prevSection = section;
      rows.push(
        <tr key={`sec-${p.residence}-${section}`}>
          <th
            colSpan={span}
            className="sticky left-0 bg-blue-50 border border-gray-200 py-1 pl-6 pr-2 text-left text-[11px] font-semibold text-blue-700"
          >
            {section}
          </th>
        </tr>
      );
    }

    rows.push(
      <tr key={p.id}>
        <th className="sticky left-0 z-10 bg-white border border-gray-200 p-2 pl-6 text-left font-normal whitespace-nowrap">
          <div className="font-medium text-gray-800">
            {p.nom} {p.prenom}
          </div>
          <div className="text-[10px] text-gray-400">
            {p.isInvite ? "invitée" : formatChambre(p.chambre) ?? ""}
          </div>
        </th>
        {columns.map((c) => (
          <td key={c.key} className="border border-gray-200 p-1 text-center">
            {renderCell(p, c.key)}
          </td>
        ))}
      </tr>
    );
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-gray-100 border border-gray-200 p-2 text-left">Habitante</th>
            {columns.map((c) => (
              <th key={c.key} className="border border-gray-200 bg-gray-50 p-2 text-center whitespace-nowrap">
                <div className="font-semibold text-gray-700">{c.label}</div>
                {c.sublabel && <div className="text-[10px] font-normal text-gray-500">{c.sublabel}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
