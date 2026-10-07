"use client";

import {
  CheckCircle2,
  Database,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  getRefurbedCatalog,
  getRefurbedCatalogImport,
  type RefurbedCatalogImport,
  uploadRefurbedCatalog,
} from "@/lib/api/refurbed-catalog";

export default function RefurbedCatalogPage() {
  const [itemsCount, setItemsCount] = useState(0);
  const [catalogImport, setCatalogImport] =
    useState<RefurbedCatalogImport | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getRefurbedCatalog()
      .then((response) => {
        setItemsCount(response.data.items_count);
        setCatalogImport(response.data.latest_import);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load catalog.",
        ),
      );
  }, []);

  useEffect(() => {
    if (
      !catalogImport ||
      !["queued", "processing"].includes(catalogImport.status)
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      getRefurbedCatalogImport(catalogImport.id)
        .then((response) => {
          const updated = response.data.import;
          setCatalogImport(updated);

          if (updated.status === "completed") {
            setItemsCount(updated.imported_rows);
            setMessage("Refurbed catalog imported successfully.");
          }
        })
        .catch(() => undefined);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [catalogImport]);

  async function upload(event: FormEvent) {
    event.preventDefault();

    if (!file) {
      setError("Select the Refurbed catalog file first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    setUploadProgress(0);

    try {
      const response = await uploadRefurbedCatalog(file, setUploadProgress);
      setCatalogImport(response.data.import);
      setMessage(response.message);
      setFile(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Catalog upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  const working =
    catalogImport && ["queued", "processing"].includes(catalogImport.status);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-sky-50/70 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Settings</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Refurbed catalog
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Import Refurbed instances so users can find the correct instance
              ID while creating inventory offers.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to settings
          </Link>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            {message}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <form
            onSubmit={(event) => void upload(event)}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <FileSpreadsheet className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Upload catalog
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Supported formats: XLSX and CSV, up to 500 MB.
                </p>
              </div>
            </div>

            <label className="mt-6 block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:border-blue-400">
              <Upload className="mx-auto h-8 w-8 text-blue-600" />
              <span className="mt-3 block text-sm font-semibold text-slate-800">
                {file?.name || "Select the refurbed_catalog file"}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Expected columns: Instance ID, Name, Name DE, Attributes,
                Attributes DE and Main Category.
              </span>
              <input
                type="file"
                accept=".xlsx,.csv"
                disabled={uploading || Boolean(working)}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>

            <button
              type="submit"
              disabled={!file || uploading || Boolean(working)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload and import
            </button>
            {uploading && (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Uploading: {uploadProgress}%
                </p>
              </div>
            )}
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Database className="h-7 w-7 text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Catalog records
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              {itemsCount.toLocaleString()}
            </p>

            {catalogImport && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <ImportStatus catalogImport={catalogImport} />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ImportStatus({
  catalogImport,
}: {
  catalogImport: RefurbedCatalogImport;
}) {
  const processing = ["queued", "processing"].includes(catalogImport.status);
  const failed = catalogImport.status === "failed";
  const Icon = processing ? LoaderCircle : failed ? XCircle : CheckCircle2;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon
          className={`h-5 w-5 ${processing ? "animate-spin text-blue-600" : failed ? "text-red-600" : "text-emerald-600"}`}
        />
        <span className="text-sm font-semibold capitalize text-slate-800">
          {catalogImport.status}
        </span>
      </div>
      <p className="mt-3 truncate text-sm text-slate-600">
        {catalogImport.file_name}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Processed</dt>
          <dd className="font-semibold text-slate-900">
            {catalogImport.total_rows.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Imported</dt>
          <dd className="font-semibold text-slate-900">
            {catalogImport.imported_rows.toLocaleString()}
          </dd>
        </div>
      </dl>
      {catalogImport.error_message && (
        <p className="mt-4 text-sm text-red-700">
          {catalogImport.error_message}
        </p>
      )}
      {processing && (
        <p className="mt-4 text-xs text-slate-500">
          Keep the imports queue worker running. You may leave this page while
          processing continues.
        </p>
      )}
    </div>
  );
}
