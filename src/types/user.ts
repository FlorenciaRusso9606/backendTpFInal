export interface User {
  id: string
  email: string
  username: string
  bio?: string
  displayname: string
  profile_picture_url?: string
  role: "ADMIN" | "USER"
  status: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED"
  created_at?: Date
  updated_at?: Date
  posts_count?: number
  followers_count?: number
  following_count?: number
  city?: string
  country_iso?: string
}

export interface DbUser extends User {
  password_hash: string
}

export interface PostUser {
  id: string
  username: string
  displayname: string
  profile_picture_url?: string
}

export interface BlockStatus {
  blockedByYou: boolean
  blockedByThem: boolean
}

export interface FollowStatus {
  isFollowing: boolean
  isFollowedBy: boolean
}
