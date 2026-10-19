export const PROVIDER_NAMES = ["r2", "gdrive"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export type UsageLevel = "ok" | "warn" | "amber" | "block";

/** Usage of one storage, as the browser sees it. */
export type ProviderUsage = {
  provider: ProviderName;
  active: boolean;
  configured: boolean;
  /** bytes counted for this app's photos (summed in Postgres) */
  appBytes: number;
  /** bytes compared with the limit (R2: appBytes; Drive: the whole Google account) */
  usedBytes: number;
  limitBytes: number | null;
  pct: number | null;
  level: UsageLevel;
  activeCount: number;
  trashedCount: number;
  archivedCount: number;
};

export type StorageThresholds = { warnPct: number; amberPct: number; blockPct: number };

export type UsageResponse = { providers: ProviderUsage[]; thresholds: StorageThresholds; active: ProviderName };

export type GoogleConnection = { account_email: string | null; root_folder_id: string | null; connected_at: string };

export type ProviderStatus = {
  active: ProviderName;
  r2: { configured: boolean };
  gdrive: { configured: boolean; appConfigured: boolean; connection: GoogleConnection | null };
};

/** What the browser does to upload one photo, decided by the server for the active storage. */
export type UploadPlan =
  | {
      mode: "direct";
      provider: "r2";
      originalKey: string;
      thumbKey: string;
      puts: { original: { url: string; headers: Record<string, string> }; thumb: { url: string; headers: Record<string, string> } };
      /** proves to POST /api/photos that the server issued these keys to this user */
      receipt: string;
    }
  | { mode: "proxy"; provider: "gdrive" };

export type ProxyUploadResult = { provider: ProviderName; originalKey: string; thumbKey: string; receipt: string };
