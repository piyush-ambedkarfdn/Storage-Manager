"use client";

import { useContext } from "react";
import { ProfileContext } from "@/components/layout/ProfileProvider";
import type { Profile } from "@/types/profile";

/** The signed-in profile. Only valid inside the admin or uploader layouts (they render ProfileProvider). */
export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error("useProfile() must be used inside <ProfileProvider>.");
  return profile;
}
