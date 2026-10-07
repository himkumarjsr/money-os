let channelSeq = 0;

/**
 * supabase.channel(name) returns the already-subscribed channel when the name
 * is reused, and adding .on() to it throws. Components that can mount more
 * than once (or remount before removeChannel finishes) need distinct names.
 */
export function uniqueChannelName(base: string): string {
  channelSeq += 1;
  return `${base}:${Date.now().toString(36)}${channelSeq}`;
}
