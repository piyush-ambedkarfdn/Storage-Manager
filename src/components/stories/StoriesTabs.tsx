"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenerateDialog } from "@/components/stories/GenerateDialog";
import { StoryList } from "@/components/stories/StoryList";
import { SuggestionList } from "@/components/stories/SuggestionList";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import { STORY_KINDS, type StoryKind } from "@/types/story";

const TABS = ["suggestions", ...STORY_KINDS] as const;

/** Suggestions | Impact stories | Case studies | Campaigns, kept in ?tab=. */
export function StoriesTabs() {
  const t = useT(storiesMessages);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("tab");
  const tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as (typeof TABS)[number]) : "suggestions";
  const [creating, setCreating] = useState(false);

  return (
    <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })} className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="suggestions" className="min-h-9">
            {t("tabSuggestions")}
          </TabsTrigger>
          {STORY_KINDS.map((k) => (
            <TabsTrigger key={k} value={k} className="min-h-9">
              {t(`tab_${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button className="min-h-10" onClick={() => setCreating(true)}>
          <Plus aria-hidden /> {t("newStory")}
        </Button>
      </div>
      <TabsContent value="suggestions">
        <SuggestionList />
      </TabsContent>
      {STORY_KINDS.map((k) => (
        <TabsContent key={k} value={k}>
          <StoryList kind={k} />
        </TabsContent>
      ))}
      {creating ? (
        <GenerateDialog mode="create" open onOpenChange={setCreating} defaultKind={tab === "suggestions" ? "impact_story" : (tab as StoryKind)} />
      ) : null}
    </Tabs>
  );
}
