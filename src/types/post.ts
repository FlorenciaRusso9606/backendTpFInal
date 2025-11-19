export interface Media {
  url: string;
  type: string;
}

export interface Author {
  id: string;
  username: string;
  displayname: string;
  profile_picture_url: string | null;
}

export interface SharedPost {
  id: string;
  text: string | null;
  link_url?: string | null;
  created_at: string;
  author: Author;
  medias: Media[];
}

export interface Post {
  id: string;
  text: string | null;
  link_url?: string | null;
  created_at: string;
  author: Author;
  medias: Media[];
  shared_post?: SharedPost | null;
  mode: string
}
