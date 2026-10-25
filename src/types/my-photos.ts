/** One of the signed-in person's own photos, with the names My uploads groups and filters by. */
export type MyPhoto = {
  id: string;
  event_date: string | null;
  created_at: string;
  note: string | null;
  program_id: string | null;
  program_name: string | null;
  village_id: string | null;
  village_name: string | null;
  /** the program category called "...activity..." (e.g. Type of Activity in CFW initiative), else the first category */
  activity: string | null;
  thumbUrl: string;
};
