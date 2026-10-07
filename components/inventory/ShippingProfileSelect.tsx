"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  getShippingProfiles,
  ShippingProfile,
} from "@/lib/api/shipping-profiles";

export function ShippingProfileSelect({
  defaultValue = "",
}: {
  defaultValue?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [selected, setSelected] = useState(defaultValue);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      const loaded: ShippingProfile[] = [];
      let page = 1;
      let lastPage = 1;

      do {
        const response = await getShippingProfiles({
          page,
          per_page: 50,
          sort: "name",
        });
        loaded.push(...response.data.profiles);
        lastPage = response.data.pagination.last_page;
        page += 1;
      } while (page <= lastPage);

      if (active) {
        const uniqueProfiles = Array.from(
          new Map(loaded.map((profile) => [profile.id, profile])).values(),
        );
        setProfiles(uniqueProfiles);
      }
    }

    loadProfiles()
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load shipping profiles.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    searchRef.current?.focus();

    function closeDropdown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [open]);

  const selectedProfile = profiles.find((profile) => profile.id === selected);
  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;

    return profiles.filter((profile) =>
      String(profile.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [profiles, search]);

  function choose(profile: ShippingProfile) {
    setSelected(profile.id);
    setOpen(false);
    setSearch("");
  }

  const selectedLabel = selectedProfile
    ? selectedProfile.name || "Shipping profile"
    : defaultValue
      ? "Current shipping profile"
      : "Select a shipping profile";

  return (
    <div ref={containerRef} className="relative mt-2">
      <input type="hidden" name="shipping_profile_id" value={selected} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={loading || profiles.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-900 outline-none transition hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className="truncate">
          {loading
            ? "Loading shipping profiles..."
            : profiles.length === 0
              ? "No shipping profiles available"
              : selectedLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shipping profiles"
                className="min-w-0 flex-1 py-3 text-sm outline-none"
              />
            </div>
          </div>
          <div role="listbox" className="max-h-64 overflow-y-auto p-2">
            {filteredProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                role="option"
                aria-selected={selected === profile.id}
                onClick={() => choose(profile)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="font-semibold">
                  {profile.name || "Shipping profile"}
                </span>
                {selected === profile.id && (
                  <Check className="h-4 w-4 shrink-0 text-blue-600" />
                )}
              </button>
            ))}
            {filteredProfiles.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                No matching shipping profiles.
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
