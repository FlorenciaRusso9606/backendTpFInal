export interface Comment {
  username: string;
  id: string;
  author_id: string;
  author_username: string;
  author_avatar?: string | null;
  post_id: string;
  text: string;
  parent_id?: string | number | null;
  created_at: string;
  updated_at?: string;
  children?: Comment[];

}