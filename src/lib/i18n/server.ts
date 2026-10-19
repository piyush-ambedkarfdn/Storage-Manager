import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale, type Messages, type TFunction } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT<K extends string>(messages: Messages<K>): Promise<TFunction<K>> {
  return makeT(messages, await getLocale());
}
