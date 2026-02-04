/**
 * NOTIFICATION MODULE
 * Independent, complaint-isolated, async. Admin gets every notification;
 * officer gets only officer-relevant events. Control routes admin-only.
 */

export { notifyAsync } from "./orchestrator";
export { NOTIFIABLE_EVENT_TYPES, isNotifiableEventType } from "./types";
export type { NotifiableEventType, TimelineEventLike } from "./types";
