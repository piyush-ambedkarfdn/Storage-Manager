/**
 * Tiny i18n: English and Hindi. Each feature keeps its own messages file in src/lib/i18n/messages/<feature>.ts,
 * so later phases add files instead of editing a shared one.
 *   export const uploadMessages = defineMessages({ en: { title: "Upload" }, hi: { title: "अपलोड" } });
 *   const t = useT(uploadMessages); t("title")
 * Placeholders: "Hello {name}" with t("hello", { name }).
 */
export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export type Messages<K extends string> = { en: Record<K, string>; hi: Record<K, string> };

/** hi must have exactly the same keys as en (TypeScript checks it). */
export function defineMessages<K extends string>(messages: { en: Record<K, string>; hi: NoInfer<Record<K, string>> }): Messages<K> {
  return messages;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export type TFunction<K extends string> = (key: K, vars?: Record<string, string | number>) => string;

export function makeT<K extends string>(messages: Messages<K>, locale: Locale): TFunction<K> {
  const dict = messages[locale] ?? messages.en;
  return (key, vars) => {
    let text = dict[key] ?? messages.en[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.split(`{${name}}`).join(String(value));
      }
    }
    return text;
  };
}
