export interface Place {
  id: string;
  name: string;
  slug: string;
  category: string;
  sector: string;
  address: string;
  coordinates: { lat: number; lng: number };
  amenities: string[];
  activities?: string[];
  description: string;
  coverImageUrl?: string;
  imageUrl?: string;
  activeCommunitiesCount: number;
  publicHours?: string;
  parkingInfo?: string;
  priceIndicator?: string;
  website?: string;
  featured?: boolean;
  status?: "published" | "cancelled" | "draft";
  demo?: boolean;
  tags?: string[];
}
