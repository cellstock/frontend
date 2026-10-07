"use client";
import { useI18n } from "@/components/i18n/language-provider";

import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import {
  getMarketplaceConnectionOptions,
  MarketplaceApiError,
} from "@/lib/api/marketplaces";
import type {
  MarketplaceCapability,
  MarketplaceFormValues,
  MarketplaceSettings,
  MarketplaceMarketSetting,
  ValidationErrors,
} from "@/types/marketplace";

interface ConnectionSettingsFormProps {
  mode: "connect" | "update";
  marketplaceSlug: string;
  capabilities: MarketplaceCapability[];
  initialAccountName?: string;
  initialSettings?: Partial<MarketplaceSettings>;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (values: MarketplaceFormValues) => Promise<void>;
}

const synchronizationOptions: Array<{
  capability: MarketplaceCapability;
  setting: "sync_orders" | "sync_products" | "sync_inventory";
  label: string;
  description: string;
}> = [
  {
    capability: "orders",
    setting: "sync_orders",
    label: "Orders",
    description: "Import and update marketplace orders.",
  },
  {
    capability: "products",
    setting: "sync_products",
    label: "Products",
    description: "Keep product and listing information synchronized.",
  },
  {
    capability: "inventory",
    setting: "sync_inventory",
    label: "Inventory",
    description: "Keep marketplace stock quantities up to date.",
  },
];

function FieldError({
  errors,
  field,
}: {
  errors: ValidationErrors;
  field: string;
}) {
  const message = errors[field]?.[0];

  if (!message) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

export function ConnectionSettingsForm({
  mode,
  marketplaceSlug,
  capabilities,
  initialAccountName = "",
  initialSettings = {},
  submitLabel,
  onCancel,
  onSubmit,
}: ConnectionSettingsFormProps) {
  const { t } = useI18n();
  const formId = useId();

  const [accountName, setAccountName] = useState(initialAccountName);

  const [apiKey, setApiKey] = useState("");

  const [settings, setSettings] = useState<MarketplaceSettings>({
    sync_orders: initialSettings.sync_orders ?? false,
    sync_products: initialSettings.sync_products ?? false,
    sync_inventory: initialSettings.sync_inventory ?? false,
    markets: initialSettings.markets ?? [],
  });

  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);

  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );

  async function loadRefurbedMarkets() {
    const token = apiKey.trim();

    if (mode === "connect" && !token) {
      setValidationErrors({
        "credentials.api_key": ["Enter the API key before loading markets."],
      });
      return;
    }

    setIsLoadingMarkets(true);
    setGeneralError("");
    setValidationErrors({});

    try {
      const response = await getMarketplaceConnectionOptions(
        marketplaceSlug,
        token || undefined,
      );
      const previous = new Map(
        (settings.markets ?? []).map((market) => [market.code, market]),
      );
      const markets: MarketplaceMarketSetting[] = response.data.markets.map(
        (market) => ({
          ...market,
          manage_orders: previous.get(market.code)?.manage_orders ?? false,
          manage_offers: previous.get(market.code)?.manage_offers ?? false,
        }),
      );
      setSettings((current) => ({ ...current, markets }));
    } catch (error) {
      setGeneralError(
        error instanceof MarketplaceApiError
          ? error.message
          : "Unable to load Refurbed markets.",
      );
    } finally {
      setIsLoadingMarkets(false);
    }
  }

  function updateMarket(
    code: string,
    changes: Partial<
      Pick<MarketplaceMarketSetting, "manage_orders" | "manage_offers">
    >,
  ) {
    setSettings((current) => {
      const markets = (current.markets ?? []).map((market) =>
        market.code === code ? { ...market, ...changes } : market,
      );
      return {
        ...current,
        markets,
        sync_orders: markets.some((market) => market.manage_orders),
        sync_products: markets.some((market) => market.manage_offers),
      };
    });
  }

  function updateSetting(
    field: "sync_orders" | "sync_products" | "sync_inventory",
    checked: boolean,
  ) {
    setSettings((current) => {
      const next = { ...current, [field]: checked };

      if (marketplaceSlug === "refurbed" && current.markets) {
        if (field === "sync_orders") {
          next.markets = current.markets.map((market) => ({
            ...market,
            manage_orders: checked,
          }));
        }

        if (field === "sync_products") {
          next.markets = current.markets.map((market) => ({
            ...market,
            manage_offers: checked,
          }));
        }
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setGeneralError("");
    setValidationErrors({});

    const trimmedAccountName = accountName.trim();
    const trimmedApiKey = apiKey.trim();

    const localErrors: ValidationErrors = {};

    if (!trimmedAccountName) {
      localErrors.account_name = ["The account name is required."];
    }

    if (mode === "connect" && !trimmedApiKey) {
      localErrors["credentials.api_key"] = ["The API key is required."];
    }

    if (
      marketplaceSlug === "refurbed" &&
      (settings.markets ?? []).length === 0
    ) {
      localErrors.markets = [
        "Load the available Refurbed markets before connecting.",
      ];
    } else if (
      marketplaceSlug === "refurbed" &&
      !(settings.markets ?? []).some(
        (market) => market.manage_orders || market.manage_offers,
      )
    ) {
      localErrors.markets = ["Select at least one Refurbed market function."];
    }

    if (Object.keys(localErrors).length > 0) {
      setValidationErrors(localErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        account_name: trimmedAccountName,
        api_key: trimmedApiKey,
        settings,
      });

      setApiKey("");
      setShowApiKey(false);
    } catch (caughtError: unknown) {
      if (caughtError instanceof MarketplaceApiError) {
        setGeneralError(caughtError.message);
        setValidationErrors(caughtError.validationErrors);
      } else {
        setGeneralError("Unable to save the marketplace connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const apiKeyHelpText =
    mode === "connect"
      ? "Enter the API key provided by the marketplace."
      : "Leave this blank to keep the currently saved credential.";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {generalError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      <div>
        <label
          htmlFor={`${formId}-account-name`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          {t("Account name")}
        </label>

        <input
          id={`${formId}-account-name`}
          name="account_name"
          type="text"
          required
          disabled={isSubmitting}
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          placeholder={t("Account Name")}
          aria-invalid={Boolean(validationErrors.account_name) || undefined}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <FieldError errors={validationErrors} field="account_name" />
      </div>

      <div>
        <label
          htmlFor={`${formId}-api-key`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          {t("API key")}
          {mode === "update" && (
            <span className="ml-1 font-normal text-slate-400">
              {t("(optional)")}
            </span>
          )}
        </label>

        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

          <input
            id={`${formId}-api-key`}
            name="api_key"
            type={showApiKey ? "text" : "password"}
            autoComplete="new-password"
            required={mode === "connect"}
            disabled={isSubmitting}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              mode === "connect"
                ? t("Enter marketplace API key")
                : t("Enter a new API key")
            }
            aria-invalid={
              Boolean(validationErrors["credentials.api_key"]) || undefined
            }
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowApiKey((current) => !current)}
            aria-label={showApiKey ? t("Hide API key") : t("Show API key")}
            aria-pressed={showApiKey}
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showApiKey ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        </div>

        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {apiKeyHelpText}
        </p>

        <FieldError errors={validationErrors} field="credentials.api_key" />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">
          {t("Synchronization settings")}
        </legend>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {t(
            "Choose the data CelleXa should synchronize for this marketplace.",
          )}
        </p>

        <div className="mt-3 space-y-3">
          {synchronizationOptions
            .filter((option) => capabilities.includes(option.capability))
            .map((option) => (
              <label
                key={option.setting}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <input
                  type="checkbox"
                  name={`settings.${option.setting}`}
                  checked={settings[option.setting]}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    updateSetting(option.setting, event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    {t("Synchronize")} {t(option.label)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {t(option.description)}
                  </span>
                </span>
              </label>
            ))}
        </div>
      </fieldset>

      {marketplaceSlug === "refurbed" && (
        <fieldset>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <legend className="text-sm font-semibold text-slate-700">
                {t("Refurbed markets")}
              </legend>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t("Choose the countries and functions CelleXa may manage.")}
              </p>
            </div>
            <button
              type="button"
              disabled={
                isSubmitting ||
                isLoadingMarkets ||
                (mode === "connect" && !apiKey.trim())
              }
              onClick={loadRefurbedMarkets}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingMarkets ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isLoadingMarkets ? t("Loading markets...") : t("Load markets")}
            </button>
          </div>

          <FieldError errors={validationErrors} field="markets" />

          {(settings.markets ?? []).length > 0 && (
            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
              {(settings.markets ?? []).map((market) => {
                const selected = market.manage_orders || market.manage_offers;
                return (
                  <div
                    key={market.code}
                    className={`rounded-xl border p-3 transition ${selected ? "border-blue-200 bg-white shadow-sm" : "border-transparent bg-white/60"}`}
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          updateMarket(market.code, {
                            manage_orders: event.target.checked,
                            manage_offers: event.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-lg"
                        aria-hidden="true"
                      >
                        {countryFlag(market.code)}
                      </span>
                      <span className="font-semibold text-slate-800">
                        Refurbed {market.code}
                      </span>
                      <span className="ml-auto text-xs text-slate-400">
                        {market.name}
                        {market.currency_code
                          ? ` · ${market.currency_code}`
                          : ""}
                      </span>
                    </label>
                    {selected && (
                      <div className="ml-8 mt-3 flex flex-wrap gap-x-6 gap-y-2 pl-8">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={market.manage_orders}
                            onChange={(event) =>
                              updateMarket(market.code, {
                                manage_orders: event.target.checked,
                              })
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          {t("Manage orders")}
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={market.manage_offers}
                            onChange={(event) =>
                              updateMarket(market.code, {
                                manage_offers: event.target.checked,
                              })
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          {t("Manage offers")}
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("Cancel")}
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}

          {isSubmitting
            ? mode === "connect"
              ? t("Connecting...")
              : t("Saving...")
            : (submitLabel ??
              (mode === "connect" ? "Connect marketplace" : "Save settings"))}
        </button>
      </div>
    </form>
  );
}

function countryFlag(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "•";
  return String.fromCodePoint(
    ...[...normalized].map((character) => 127397 + character.charCodeAt(0)),
  );
}
