/**
 * NOTIFICATION MODULE
 * Independent, complaint-isolated, async. Recipients per event from EVENT_RECEIVER_MAP.
 */

export { notifyAsync } from "./orchestrator";
export { NOTIFIABLE_EVENT_TYPES, isNotifiableEventType } from "./types";
export type { NotifiableEventType, TimelineEventLike } from "./types";
export {
  EVENT_RECEIVER_MAP,
  type EventReceiverConfig,
  type ReceiverKind,
} from "./eventReceiversMap";
