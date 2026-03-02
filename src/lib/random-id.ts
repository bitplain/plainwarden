/**
 * Generate a random identifier that works in **all** browser contexts,
 * including non-secure origins (plain HTTP accessed by IP address) where
 * `crypto.randomUUID()` is not available.
 *
 * Fallback chain:
 *  1. `crypto.randomUUID()`        – secure contexts only
 *  2. `crypto.getRandomValues()`   – all modern browsers
 *  3. `Date.now()` + `Math.random()` – last resort
 */
export function createRandomId(): string {
  // 1. Preferred: native UUID (requires secure context)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // 2. Fallback: build UUID v4 from getRandomValues
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version (4) and variant (10xx) bits per RFC 4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // 3. Last resort
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
