
export type Guest = {
  id: string;
  name: string;
  room_number: string;
  room_id: string | null;
  last_activity: string;
  unread_messages: number;
  wait_time_minutes: number | null;
  guest_count: number | null;
};

export type Room = {
  id: string;
  room_number: string;
  status: string;
  floor: string | null;
  type: string | null;
};

export type Message = {
  id: string;
  guest_id: string;
  content: string;
  is_guest: boolean;
  is_audio: boolean;
  audio_url?: string;
  created_at: string;
  responded_at: string | null;
  response_time: number | null;
  is_media?: boolean;
  media_url?: string;
  media_type?: 'image' | 'video';
};
