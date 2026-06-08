export type Guest = {
  id: string;
  name: string;
  device_id: string;
  photo_count: number;
  created_at: string;
};

export type Photo = {
  id: string;
  guest_id: string;
  guest_name: string;
  storage_path: string;
  public_url: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
};

export type LikeResult = {
  liked: boolean;
  like_count: number;
};

export type GuestStatus = {
  name: string;
  photo_count: number;
  remaining: number;
  photo_limit: number;
};

export type UploadResult = {
  photo_id: string;
  public_url: string;
  remaining: number;
  photo_count: number;
};
