"use client";
import { EntityToggleButton } from "./EntityToggleButton";
export function SaveButton(props: {itemType: "event" | "place" | "community"; itemId: string; compact?: boolean}) {
  return <EntityToggleButton {...props} action="saved" />;
}
