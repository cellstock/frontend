"use client";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/components/i18n/language-provider";

type Kind = "users" | "plans" | "subscriptions";
type Row = Record<string, unknown> & { id: number };
type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "status"
  | "subscription_status"
  | "interval"
  | "boolean"
  | "role"
  | "user"
  | "plan";
type FieldDef = readonly [string, string, FieldType];
type ColumnDef = readonly [string, string];
type Option = { value: string; label: string };
const configs: Record<
  Kind,
  { title: string; fields: readonly FieldDef[]; columns: readonly ColumnDef[] }
> = {
  users: {
    title: "Users & customers",
    fields: [
      ["name", "Name", "text"],
      ["email", "Email", "email"],
      ["password", "Password", "password"],
      ["password_confirmation", "Confirm password", "password"],
      ["role_id", "Role", "role"],
      ["status", "Status", "status"],
    ],
    columns: [
      ["name", "Name"],
      ["email", "Email"],
      ["role", "Role"],
      ["status", "Enabled / disabled"],
    ],
  },
  plans: {
    title: "Plans",
    fields: [
      ["name", "Name", "text"],
      ["slug", "Slug", "text"],
      ["description", "Description", "textarea"],
      ["price", "Price", "number"],
      ["currency", "Currency", "text"],
      ["billing_interval", "Billing interval", "interval"],
      ["is_active", "Active", "boolean"],
    ],
    columns: [
      ["name", "Name"],
      ["price", "Price"],
      ["billing_interval", "Billing interval"],
      ["is_active", "Active"],
    ],
  },
  subscriptions: {
    title: "Subscriptions",
    fields: [
      ["user_id", "User", "user"],
      ["plan_id", "Plan", "plan"],
      ["status", "Status", "subscription_status"],
      ["cancel_at_period_end", "Cancel at period end", "boolean"],
    ],
    columns: [
      ["user", "User"],
      ["plan", "Plan"],
      ["status", "Status"],
      ["cancel_at_period_end", "Cancel at period end"],
    ],
  },
};

export function AdminResourcePage({ kind }: { kind: Kind }) {
  const { t } = useI18n(),
    config = configs[kind];
  const [rows, setRows] = useState<Row[]>([]),
    [options, setOptions] = useState<Record<string, Option[]>>({});
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [editing, setEditing] = useState<Row | null | undefined>(),
    [deleting, setDeleting] = useState<Row | null>(null),
    [saving, setSaving] = useState(false),
    [changingStatus, setChangingStatus] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ page: String(page), per_page: "10" });
      if (search.trim()) q.set("search", search.trim());
      if (status) {
        if (kind === "plans") q.set("active", String(status === "active"));
        else q.set("status", status);
      }
      const r = await fetch(`/api/admin/${kind}?${q}`),
        j = await r.json();
      if (!r.ok) throw new Error(j.message);
      const payload = Array.isArray(j.data)
        ? { data: j.data, last_page: j.meta?.last_page ?? 1 }
        : j.data;
      setRows(payload.data ?? []);
      setLastPage(payload.last_page ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Unable to load data."));
    } finally {
      setLoading(false);
    }
  }, [kind, page, search, status, t]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    async function run() {
      try {
        if (kind === "users") {
          const r = await fetch("/api/admin/roles"),
            j = await r.json();
          if (r.ok)
            setOptions({
              role: (j.data?.roles ?? []).map((x: Row) => ({
                value: String(x.id),
                label: String(x.name),
              })),
            });
        } else if (kind === "subscriptions") {
          const [ur, pr] = await Promise.all([
              fetch("/api/admin/users?per_page=100"),
              fetch("/api/admin/plans?per_page=100"),
            ]),
            [uj, pj] = await Promise.all([ur.json(), pr.json()]);
          setOptions({
            user: (uj.data ?? []).map((x: Row) => ({
              value: String(x.id),
              label: `${String(x.name)} (${String(x.email)})`,
            })),
            plan: (pj.data?.data ?? []).map((x: Row) => ({
              value: String(x.id),
              label: String(x.name),
            })),
          });
        }
      } catch {
        setOptions({});
      }
    }
    void run();
  }, [kind]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const data: Record<string, unknown> = Object.fromEntries(
      new FormData(e.currentTarget),
    );
    for (const [name, , type] of config.fields) {
      if (type === "boolean") data[name] = data[name] === "on";
      if (
        ["number", "role", "user", "plan"].includes(type) &&
        data[name] !== ""
      )
        data[name] = Number(data[name]);
    }
    try {
      const r = await fetch(
          `/api/admin/${kind}${editing?.id ? `/${editing.id}` : ""}`,
          {
            method: editing?.id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        ),
        j = await r.json();
      if (!r.ok)
        throw new Error(
          String(Object.values(j.errors ?? {}).flat()[0] ?? j.message),
        );
      setMessage(
        t(editing?.id ? "Updated successfully." : "Created successfully."),
      );
      setEditing(undefined);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("Unable to save changes."),
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(row: Row) {
    const next = row.status === "active" ? "inactive" : "active";
    setChangingStatus(row.id);
    setError("");
    try {
      const r = await fetch(`/api/admin/users/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        }),
        j = await r.json();
      if (!r.ok)
        throw new Error(
          String(Object.values(j.errors ?? {}).flat()[0] ?? j.message),
        );
      setMessage(
        t(
          next === "active"
            ? "User enabled successfully."
            : "User disabled successfully.",
        ),
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("Unable to update user status."),
      );
    } finally {
      setChangingStatus(null);
    }
  }
  async function remove() {
    if (!deleting) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/${kind}/${deleting.id}`, {
          method: "DELETE",
        }),
        j = await r.json();
      if (!r.ok) throw new Error(j.message);
      setDeleting(null);
      setMessage(t("Deleted successfully."));
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("Unable to delete this item."),
      );
    } finally {
      setSaving(false);
    }
  }
  const display = (value: unknown) => {
    if (value && typeof value === "object")
      return String(
        (value as Record<string, unknown>).name ??
          (value as Record<string, unknown>).email ??
          "",
      );
    if (typeof value === "boolean") return value ? t("Active") : t("Inactive");
    return String(value ?? "—");
  };
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">
              {t("Administration")}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{t(config.title)}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("Search, filter and manage portal records securely.")}
            </p>
          </div>
          <button
            onClick={() => setEditing(null)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("Add new")}
          </button>
        </div>
        {message && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-5 flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </p>
        )}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[1fr_200px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("Search by name or email")}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm"
              />
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            >
              <option value="">{t("All statuses")}</option>
              <option value="active">{t("Active")}</option>
              {kind !== "subscriptions" && (
                <option value="inactive">{t("Inactive")}</option>
              )}
              {kind === "subscriptions" && (
                <>
                  <option value="cancelled">{t("Cancelled")}</option>
                  <option value="past_due">{t("Past due")}</option>
                </>
              )}
            </select>
          </div>
          {loading ? (
            <div className="flex justify-center p-12">
              <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-12 text-center text-sm text-slate-500">
              {t("No records found.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("Sr #")}</th>
                    {config.columns.map(([name, label]) => (
                      <th key={name} className="px-5 py-3">
                        {t(label)}
                      </th>
                    ))}
                    <th className="px-5 py-3">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-blue-50/40">
                      <td className="px-5 py-4 font-semibold text-slate-500">
                        {(page - 1) * 10 + index + 1}
                      </td>
                      {config.columns.map(([name]) => (
                        <td key={name} className="max-w-64 truncate px-5 py-4">
                          {kind === "users" && name === "status" ? (
                            <button
                              disabled={changingStatus === row.id}
                              onClick={() => void toggle(row)}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-blue-50 disabled:opacity-50"
                            >
                              <span
                                className={`relative h-5 w-9 rounded-full ${row.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`}
                              >
                                <span
                                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${row.status === "active" ? "left-[18px]" : "left-0.5"}`}
                                />
                              </span>
                              {t(
                                row.status === "active"
                                  ? "Enabled"
                                  : "Disabled",
                              )}
                            </button>
                          ) : (
                            display(row[name])
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditing(row)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(row)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 p-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500">
              {t("Page")} {page} / {lastPage}
            </span>
            <button
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
      {editing !== undefined && (
        <Modal
          title={editing ? t("Edit record") : t("Add new record")}
          close={() => setEditing(undefined)}
        >
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {config.fields.map(([name, label, type]) => (
              <Field
                key={name}
                name={name}
                label={t(label)}
                type={type}
                options={options[type] ?? []}
                value={
                  name === "role_id"
                    ? (editing?.role as Record<string, unknown> | undefined)?.id
                    : editing?.[name]
                }
              />
            ))}
            <button
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white sm:col-span-2"
            >
              {saving ? t("Saving...") : t("Save changes")}
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title={t("Confirm deletion")} close={() => setDeleting(null)}>
          <p className="text-sm text-slate-600">
            {t("This action cannot be undone.")}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setDeleting(null)}
              className="rounded-xl border px-4 py-2"
            >
              {t("Cancel")}
            </button>
            <button
              disabled={saving}
              onClick={() => void remove()}
              className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
            >
              {t("Delete")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Field({
  name,
  label,
  type,
  value,
  options,
}: {
  name: string;
  label: string;
  type: FieldType;
  value: unknown;
  options: Option[];
}) {
  const cls = "mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5";
  if (type === "textarea")
    return (
      <label className="text-sm font-semibold sm:col-span-2">
        {label}
        <textarea
          name={name}
          defaultValue={String(value ?? "")}
          className={`${cls} min-h-24`}
        />
      </label>
    );
  if (["role", "user", "plan"].includes(type))
    return (
      <label className="text-sm font-semibold">
        {label}
        <select
          required
          name={name}
          defaultValue={String(value ?? "")}
          className={cls}
        >
          <option value="" disabled>
            Select {label.toLowerCase()}
          </option>
          {options.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
    );
  if (type === "status")
    return (
      <label className="text-sm font-semibold">
        {label}
        <select
          name={name}
          defaultValue={String(value ?? "active")}
          className={cls}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
    );
  if (type === "subscription_status")
    return (
      <label className="text-sm font-semibold">
        {label}
        <select
          name={name}
          defaultValue={String(value ?? "active")}
          className={cls}
        >
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="past_due">Past due</option>
        </select>
      </label>
    );
  if (type === "interval")
    return (
      <label className="text-sm font-semibold">
        {label}
        <select
          name={name}
          defaultValue={String(value ?? "month")}
          className={cls}
        >
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </label>
    );
  if (type === "boolean")
    return (
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input name={name} type="checkbox" defaultChecked={Boolean(value)} />
        {label}
      </label>
    );
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={String(value ?? "")}
        className={cls}
      />
    </label>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
