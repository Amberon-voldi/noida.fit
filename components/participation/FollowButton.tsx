"use client";
import { EntityToggleButton } from "./EntityToggleButton";
export function FollowButton({ communityId, compact, refreshPage }: {communityId: string; compact?: boolean; refreshPage?: boolean}) {
  return <EntityToggleButton itemId={communityId} itemType="community" action="follow" compact={compact} refreshPage={refreshPage} />;
}
