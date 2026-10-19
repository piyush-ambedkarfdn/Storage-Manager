"use client";

import { createContext } from "react";
import type { Profile } from "@/types/profile";

export const ProfileContext = createContext<Profile | null>(null);

/** Gives client components the signed-in profile loaded by the server layout. */
export function ProfileProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}
