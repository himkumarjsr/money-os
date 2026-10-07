/** Native Press — port of web app/press/page.tsx. */
import { ComingSoon } from "@/components/content/ComingSoon";

export default function PressScreen() {
  return (
    <ComingSoon
      eyebrow="Press"
      body="Media kit and press contacts will appear here."
      primary={{ label: "hello@finkoin.com", href: "mailto:hello@finkoin.com" }}
      secondary={{ label: "← Back home", href: "/" }}
    />
  );
}
