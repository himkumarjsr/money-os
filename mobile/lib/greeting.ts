/**
 * Greeting for the moment the user actually sees a message, not when it was
 * scheduled: a morning tip opened in the evening says "Good evening".
 */
export function timeGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}
