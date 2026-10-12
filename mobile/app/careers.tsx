/** Native Careers — port of web app/careers/page.tsx ("Contact us" opens /contact). */
import { ComingSoon } from "@/components/content/ComingSoon";

export default function CareersScreen() {
  return (
    <ComingSoon
      eyebrow="Careers"
      body="We're not hiring publicly yet — check back later."
      primary={{ label: "Contact us", href: "/contact" }}
    />
  );
}
