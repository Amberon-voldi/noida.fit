export interface Activity {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  imageUrl?: string;
  status?: "published" | "cancelled" | "draft";
  demo?: boolean;
  tags?: string[];
}
