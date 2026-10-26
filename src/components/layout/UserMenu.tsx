"use client";

import { clearAllDrafts } from "@/lib/drafts/store";
import { clearAllUploadDrafts } from "@/lib/upload/draft-db";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useT } from "@/lib/i18n/provider";
import { commonMessages } from "@/lib/i18n/messages/common";

export function UserMenu() {
  const profile = useProfile();
  const t = useT(commonMessages);
  const router = useRouter();
  const name = profile.full_name || profile.login_id || profile.email || "";

  async function signOut() {
    // nothing this person typed or picked stays on the device
    clearAllDrafts();
    await clearAllUploadDrafts();
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="min-h-11 max-w-48 gap-2 px-2">
          <UserRound className="size-5 shrink-0" aria-hidden />
          <span className="truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">
            {profile.role === "admin" ? t("roleAdmin") : t("roleUploader")}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/change-password")}>
          <KeyRound aria-hidden /> {t("changePassword")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut aria-hidden /> {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
