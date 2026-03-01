/**
 * Shared spring configuration for the event "bounce" animation
 * that plays when an event lands on a new date cell after drag-and-drop.
 *
 * Physics: stiff spring with moderate damping → quick snap then 1-2 visible bounces.
 */
export const BOUNCE_SPRING = {
  type: "spring" as const,
  stiffness: 340,
  damping: 20,
  mass: 0.6,
  restDelta: 0.5,
} as const;
