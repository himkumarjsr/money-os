import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { TaxTeachContent } from "@/lib/taxTeachContent";
import { themedStyles, Colors } from "@/constants/theme";

export type { TaxTeachContent } from "@/lib/taxTeachContent";

/** `?` chip that opens the teach panel (what / who / limit / example / pro tip) in a sheet. */
export function TaxTeachTooltip({
  content,
  ariaLabel = "Learn more about this field",
}: {
  content: TaxTeachContent;
  ariaLabel?: string;
}) {
  const { mounted, open, show, hide } = useLazySheet();
  return (
    <>
      <Pressable
        onPress={show}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      >
        <Text style={styles.chipText}>?</Text>
      </Pressable>
      {mounted ? (
        <BottomSheet visible={open} onClose={hide} scroll>
          <View style={styles.panel} accessibilityRole="summary">
            <TeachRow term="What it is" body={content.what} />
            <TeachRow term="Who can claim" body={content.who} />
            {content.limit ? (
              <TeachRow term="Maximum limit" body={content.limit} />
            ) : null}
            <TeachRow term="Example" body={content.example} />
            <View style={styles.proTip}>
              <Text style={[styles.term, styles.proTipText]}>Pro tip</Text>
              <Text style={[styles.body, styles.proTipText]}>
                {content.proTip}
              </Text>
            </View>
          </View>
        </BottomSheet>
      ) : null}
    </>
  );
}

/**
 * Mount the sheet only while in use: every mounted BottomSheet subscribes to
 * keyboard events, and the tax worksheet has dozens of `?` chips.
 */
export function useLazySheet() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMounted(true);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    timer.current = setTimeout(() => setMounted(false), 400);
  }, []);
  return { mounted, open, show, hide };
}

function TeachRow({ term, body }: { term: string; body: string }) {
  return (
    <View>
      <Text style={styles.term}>{term}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

export function SectionTeachHeading({
  title,
  content,
}: {
  title: string;
  content: TaxTeachContent;
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingText}>{title}</Text>
      <TaxTeachTooltip content={content} ariaLabel={`Learn more: ${title}`} />
    </View>
  );
}

const styles = themedStyles(() => ({
  chip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPressed: {
    borderColor: "rgba(83,74,183,0.4)",
    backgroundColor: Colors.primaryLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    lineHeight: 14,
  },
  panel: { gap: 8, paddingBottom: 4 },
  term: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    lineHeight: 19,
  },
  body: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  proTip: {
    borderRadius: 8,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  proTipText: { color: Colors.primaryDark },
  heading: {
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  headingText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primary,
  },
}));
