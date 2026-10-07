"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useCallback, useMemo, useState } from "react";

import { useResource } from "@/components/dashboard/dashboard-provider";
import { InventoryShell } from "@/components/inventory/InventoryTablePage";
import {
  getInventory,
  importInventoryFile,
  InventoryApiError,
} from "@/lib/api/inventory";
import type { InventoryImportFailure } from "@/lib/api/inventory";
import type { InventoryOffer } from "@/types/inventory";

interface PreviewRow {
  row: number;
  sku: string;
  stock: string;
  valid: boolean;
  message?: string;
}

interface ImportReport {
  name: string;
  marketCode: string;
  processed: number;
  successful: number;
  failed: number;
  failures: InventoryImportFailure[];
}

export function InventoryFilesPage() {
  const loader = useCallback(() => getInventory({ limit: 1 }), []);
  const { data } = useResource("inventory-import-options", loader, true);
  const markets = useMemo(() => data?.data.markets ?? [], [data]);
  const [marketCode, setMarketCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedMarket = marketCode || markets[0]?.code || "";

  async function prepareFile(selectedFile: File) {
    setError("");
    setMessage("");
    setReport(null);

    if (!selectedFile.name.toLowerCase().match(/\.(csv|txt)$/)) {
      setError("Select a CSV file.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("The CSV file cannot be larger than 10 MB.");
      return;
    }

    const rows = parseInventoryCsv(await selectedFile.text());
    if (rows.length === 0) {
      setError(
        "The CSV must contain sku and stock columns with at least one row.",
      );
      return;
    }
    setFile(selectedFile);
    setPreview(rows);
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) await prepareFile(selectedFile);
    event.target.value = "";
  }

  async function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files[0];
    if (selectedFile) await prepareFile(selectedFile);
  }

  async function upload() {
    if (!file || !selectedMarket) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await importInventoryFile(file, selectedMarket);
      setReport({
        name: file.name,
        marketCode: response.data.market_code,
        ...response.data,
      });
      setMessage(
        response.data.failed
          ? `${response.data.successful} updates succeeded and ${response.data.failed} rows failed.`
          : response.message,
      );
      setFile(null);
      setPreview([]);
    } catch (caught) {
      setError(
        caught instanceof InventoryApiError
          ? caught.message
          : "Unable to import inventory.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportInventory(format: "csv" | "xls") {
    if (!selectedMarket) return;
    setExporting(true);
    setError("");
    try {
      const offers: InventoryOffer[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await getInventory({
          page,
          limit: 100,
          market: selectedMarket,
        });
        offers.push(...response.data.offers);
        lastPage = response.data.pagination.last_page;
        page++;
      } while (page <= lastPage);
      downloadInventory(offers, selectedMarket, format);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to export inventory.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <InventoryShell
      title="Importing your inventory"
      subtitle="Update stock quantities from a CSV file and export inventory by marketplace locale."
    >
      {error && (
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </p>
      )}
      {message && (
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {message}
        </p>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-[minmax(260px,420px)_1fr] md:items-end">
          <label className="block text-sm font-semibold text-slate-700">
            Marketplace locale
            <select
              value={selectedMarket}
              onChange={(event) => {
                setMarketCode(event.target.value);
                setFile(null);
                setPreview([]);
                setReport(null);
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="" disabled>
                Select a marketplace locale
              </option>
              {markets.map((market) => (
                <option key={market.code} value={market.code}>
                  Refurbed {market.code} · {market.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm leading-6 text-slate-500">
            Only SKUs available in the selected locale can be updated. Stock is
            sent to Refurbed in batches of 50 and saved locally after success.
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Upload inventory CSV
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Required columns: <strong>sku</strong> and{" "}
                <strong>stock</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Download template
            </button>
          </div>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => void dropFile(event)}
            className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center"
          >
            <Upload className="mx-auto h-8 w-8 text-blue-600" />
            <p className="mt-3 font-semibold text-slate-800">
              Drop your CSV here
            </p>
            <p className="mt-1 text-sm text-slate-500">or choose a file</p>
            <label className="mt-4 inline-flex cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
              Select CSV file
              <input
                type="file"
                accept=".csv,.txt,text/csv"
                disabled={busy || !selectedMarket}
                onChange={(event) => void selectFile(event)}
                className="sr-only"
              />
            </label>
          </div>

          {file && (
            <Preview
              file={file}
              rows={preview}
              busy={busy}
              onRemove={() => {
                setFile(null);
                setPreview([]);
              }}
              onUpload={() => void upload()}
            />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Download inventory
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Export every offer from Refurbed {selectedMarket || ""}. Pagination
            is handled automatically.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={exporting || !selectedMarket}
              onClick={() => void exportInventory("csv")}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Preparing..." : "Download CSV"}
            </button>
            <button
              type="button"
              disabled={exporting || !selectedMarket}
              onClick={() => void exportInventory("xls")}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-500 px-5 py-3 text-sm font-bold text-blue-600 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </button>
          </div>
          {report && <Report report={report} />}
        </section>
      </div>
    </InventoryShell>
  );
}

function Preview({
  file,
  rows,
  busy,
  onRemove,
  onUpload,
}: {
  file: File;
  rows: PreviewRow[];
  busy: boolean;
  onRemove: () => void;
  onUpload: () => void;
}) {
  const invalid = rows.filter((row) => !row.valid).length;
  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{file.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {rows.length} rows · {invalid} invalid in preview
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove selected file"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Validation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.slice(0, 10).map((row) => (
              <tr key={`${row.row}-${row.sku}`}>
                <td className="px-4 py-3">{row.row}</td>
                <td className="px-4 py-3 font-medium">{row.sku || "—"}</td>
                <td className="px-4 py-3">{row.stock || "—"}</td>
                <td
                  className={`px-4 py-3 ${row.valid ? "text-emerald-700" : "text-red-700"}`}
                >
                  {row.valid ? "Ready" : row.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <p className="mt-2 text-xs text-slate-500">
          Showing the first 10 of {rows.length} rows.
        </p>
      )}
      <button
        type="button"
        disabled={busy || rows.every((row) => !row.valid)}
        onClick={onUpload}
        className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Updating Refurbed inventory..." : "Confirm and import"}
      </button>
    </div>
  );
}

function Report({ report }: { report: ImportReport }) {
  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="font-bold text-slate-900">Latest import report</h3>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <dt className="text-slate-500">File</dt>
        <dd className="font-semibold">{report.name}</dd>
        <dt className="text-slate-500">Marketplace</dt>
        <dd>Refurbed {report.marketCode}</dd>
        <dt className="text-slate-500">Processed</dt>
        <dd>{report.processed}</dd>
        <dt className="text-slate-500">Successful</dt>
        <dd className="text-emerald-700">{report.successful}</dd>
        <dt className="text-slate-500">Failed</dt>
        <dd className="text-red-700">{report.failed}</dd>
      </dl>
      {report.failures.length > 0 && (
        <>
          <div className="mt-5 max-h-56 overflow-auto rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">Rejected rows</p>
            <ul className="mt-2 space-y-2 text-xs text-red-700">
              {report.failures.map((failure, index) => (
                <li key={`${failure.row}-${failure.sku}-${index}`}>
                  {failure.row ? `Row ${failure.row} · ` : ""}
                  <strong>{failure.sku || "Missing SKU"}</strong>:{" "}
                  {failure.message}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => downloadFailures(report)}
            className="mt-3 text-sm font-semibold text-blue-600"
          >
            Download rejected rows
          </button>
        </>
      )}
    </div>
  );
}

function parseInventoryCsv(content: string): PreviewRow[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const delimiter =
    (lines[0]?.match(/;/g)?.length ?? 0) > (lines[0]?.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const headers = parseCsvLine(lines[0] || "", delimiter).map((value) =>
    value.trim().toLowerCase(),
  );
  const skuIndex = headers.indexOf("sku");
  const stockIndex = headers.indexOf("stock");
  if (skuIndex < 0 || stockIndex < 0) return [];
  return lines.slice(1).flatMap((line, index) => {
    if (!line.trim()) return [];
    const columns = parseCsvLine(line, delimiter);
    const sku = (columns[skuIndex] || "").trim();
    const stock = (columns[stockIndex] || "").trim();
    const validStock = /^\d+$/.test(stock);
    return [
      {
        row: index + 2,
        sku,
        stock,
        valid: sku !== "" && validStock,
        message:
          sku === ""
            ? "SKU is required"
            : validStock
              ? undefined
              : "Stock must be zero or a positive whole number",
      },
    ];
  });
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index++;
    } else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) {
      values.push(value);
      value = "";
    } else value += character;
  }
  values.push(value);
  return values;
}

function downloadTemplate() {
  downloadBlob(
    "inventory-template.csv",
    "sku,stock\r\nEXAMPLE-SKU,10\r\n",
    "text/csv",
  );
}

function downloadInventory(
  offers: InventoryOffer[],
  marketCode: string,
  format: "csv" | "xls",
) {
  const rows = [
    ["sku", "stock", "title", "state", "price", "currency"],
    ...offers.map((offer) => [
      offer.sku,
      String(offer.stock),
      offer.instance_name,
      offer.state,
      offer.reference_price,
      offer.reference_currency_code,
    ]),
  ];
  if (format === "csv") {
    downloadBlob(
      `inventory-${marketCode}.csv`,
      rows.map((row) => row.map(csvValue).join(",")).join("\r\n"),
      "text/csv",
    );
    return;
  }
  const table = rows
    .map(
      (row) =>
        `<Row>${row.map((value) => `<Cell><Data ss:Type="String">${xmlValue(value)}</Data></Cell>`).join("")}</Row>`,
    )
    .join("");
  downloadBlob(
    `inventory-${marketCode}.xls`,
    `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Inventory"><Table>${table}</Table></Worksheet></Workbook>`,
    "application/vnd.ms-excel",
  );
}

function downloadFailures(report: ImportReport) {
  const rows = [
    ["row", "sku", "stock", "code", "message"],
    ...report.failures.map((failure) => [
      String(failure.row ?? ""),
      failure.sku,
      failure.stock ?? "",
      String(failure.code),
      failure.message,
    ]),
  ];
  downloadBlob(
    `inventory-errors-${report.marketCode}.csv`,
    rows.map((row) => row.map(csvValue).join(",")).join("\r\n"),
    "text/csv",
  );
}

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
function xmlValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function downloadBlob(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
