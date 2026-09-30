"use client";
import { EntityToggleButton } from "./EntityToggleButton";
export function FollowButton({ communityId, compact }: {communityId: string; compact?: boolean}) {
  return <EntityToggleButton itemId={communityId} itemType="community" action="follow" compact={compact} />;
}
