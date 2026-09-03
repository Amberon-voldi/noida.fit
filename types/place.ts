export interface Place {
  id: string;
  name: string;
  slug: string;
  category: string;
  sector: string;
  address: string;
  coordinates: { lat: number; lng: number };
  amenities: string[];
  description: string;
  coverImageUrl?: string;
  activeCommunitiesCount: number;
  publicHours?: string;
  parkingInfo?: string;
}
