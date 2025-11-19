export interface Report {
  id: string;
  reporter_id: number;
  reporter_username: string;
  target_type: "post" | "comment";
  target_id: number;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at?: string;
}
