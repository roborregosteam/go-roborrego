"use client";

import { useRef, useState } from "react";

import { api } from "~/trpc/react";

type ParsedRow = {
  name: string;
  email: string;
  role: "VIEWER" | "MEMBER" | "ADMIN";
  status: "ACTIVE" | "INACTIVE" | "ALUMNI";
  subTeam: string;
  phone: string;
  githubUsername: string;
  _error?: string;
};

const VALID_ROLES = new Set(["VIEWER", "MEMBER", "ADMIN"]);
const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "ALUMNI"]);

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const get = (name: string) => cols[idx(name)] ?? "";

    const name = get("name");
    const email = get("email");
    const roleRaw = get("role").toUpperCase() || "MEMBER";
    const statusRaw = get("status").toUpperCase() || "ACTIVE";

    let _error: string | undefined;
    if (!name) _error = "Name is required";
    else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      _error = "Invalid email";
    else if (!VALID_ROLES.has(roleRaw)) _error = `Invalid role: ${roleRaw}`;
    else if (!VALID_STATUSES.has(statusRaw))
      _error = `Invalid status: ${statusRaw}`;

    return {
      name,
      email,
      role: (VALID_ROLES.has(roleRaw) ? roleRaw : "MEMBER") as ParsedRow["role"],
      status: (VALID_STATUSES.has(statusRaw)
        ? statusRaw
        : "ACTIVE") as ParsedRow["status"],
      subTeam: get("subteam") || get("sub_team") || get("subTeam") || "",
      phone: get("phone"),
      githubUsername: get("github") || get("githubusername") || "",
      _error,
    };
  });
}

export function CsvImportPanel({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{
    imported: number;
    failed: number;
  } | null>(null);

  const importMembers = api.member.importMembers.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
    };
    reader.readAsText(file);
  }

  const validRows = rows?.filter((r) => !r._error) ?? [];
  const errorRows = rows?.filter((r) => r._error) ?? [];

  function handleImport() {
    if (!validRows.length) return;
    importMembers.mutate(
      validRows.map(({ _error: _, ...r }) => ({
        ...r,
        subTeam: r.subTeam || undefined,
        phone: r.phone || undefined,
        githubUsername: r.githubUsername || undefined,
      })),
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-semibold text-gray-900 mb-1">Bulk CSV Import</h2>
      <p className="text-xs text-gray-500 mb-4">
        CSV must have a header row with columns:{" "}
        <code className="bg-gray-100 px-1 rounded">
          name, email, role, status, subTeam, phone, githubUsername
        </code>
        . Only <code className="bg-gray-100 px-1 rounded">name</code> and{" "}
        <code className="bg-gray-100 px-1 rounded">email</code> are required.
        Existing members are updated by email; new records are created.
      </p>

      {/* File picker */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Choose CSV file
        </button>
        <span className="text-sm text-gray-500">
          {fileName || "No file chosen"}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* Preview */}
      {rows !== null && (
        <>
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span className="text-gray-700">
              {rows.length} row{rows.length !== 1 ? "s" : ""} parsed
            </span>
            {validRows.length > 0 && (
              <span className="text-green-700">{validRows.length} valid</span>
            )}
            {errorRows.length > 0 && (
              <span className="text-red-600">
                {errorRows.length} with errors
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4 max-h-72 overflow-y-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="sticky top-0">
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Email</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Role</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Sub-team</th>
                  <th className="px-3 py-2 font-medium text-gray-600">GitHub</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 last:border-0 ${
                      row._error ? "bg-red-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-3 py-2">{row.name || "—"}</td>
                    <td className="px-3 py-2">{row.email || "—"}</td>
                    <td className="px-3 py-2">{row.role}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.subTeam || "—"}</td>
                    <td className="px-3 py-2">{row.githubUsername || "—"}</td>
                    <td className="px-3 py-2 text-red-600">{row._error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`text-sm mb-3 px-3 py-2 rounded-lg border ${
                result.failed === 0
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}
            >
              {result.imported} imported successfully
              {result.failed > 0 && `, ${result.failed} failed`}.
            </div>
          )}

          <div className="flex gap-2">
            {!result && (
              <button
                onClick={handleImport}
                disabled={!validRows.length || importMembers.isPending}
                className="px-4 py-2 bg-[#1a2744] text-white text-sm rounded-lg hover:bg-[#243660] disabled:opacity-50 transition-colors"
              >
                {importMembers.isPending
                  ? "Importing…"
                  : `Import ${validRows.length} member${validRows.length !== 1 ? "s" : ""}`}
              </button>
            )}
            {result && (
              <button
                onClick={onDone}
                className="px-4 py-2 bg-[#1a2744] text-white text-sm rounded-lg hover:bg-[#243660] transition-colors"
              >
                Done
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setRows(null);
                setFileName("");
                setResult(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
