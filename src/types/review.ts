/** A photo waiting for an admin's decision. */
export type ReviewPhoto = {
  id: string;
  created_at: string;
  event_date: string | null;
  note: string | null;
  consent: "yes" | "no" | "unknown";
  has_children: boolean;
  staff_id: string | null;
  staff_name: string | null;
  program_id: string | null;
  program_name: string | null;
  village_id: string | null;
  village_name: string | null;
  district_name: string | null;
  /** the program category called "...activity..." (e.g. Type of Activity in CFW initiative), else the first category */
  activity: string | null;
  thumbUrl: string;
};

export type ReviewDecisionResult = { requested: number; changed: number };
