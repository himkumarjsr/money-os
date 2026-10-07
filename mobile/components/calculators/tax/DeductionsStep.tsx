import { StyleSheet, Text, View } from "react-native";
import { formatIndian } from "@/lib/formatters";
import { TEACH } from "@/lib/taxTeachContent";
import { TaxTeachTooltip } from "../TaxTeachTooltip";
import { ToggleSection } from "../ToggleSection";
import { rupees } from "./format";
import { Mt, StepCard, TaxNumberInput, tx } from "./primitives";
import type { TaxCalcState } from "./useTaxCalculatorState";

export function DeductionsStep({ s }: { s: TaxCalcState }) {
  const { i, update } = s;
  const raw80C =
    i.c80Elss + i.c80Ppf + i.c80Lic + i.c80Epf + i.c80Tuition + i.c80Principal;

  return (
    <StepCard
      title="Step 4 · Deductions (old regime)"
      teach={TEACH.sections.deductions}
      blurb="Turn these on only when comparing old regime savings — Chapter VI-A (except employer NPS) largely disappears under new."
    >
      <View style={{ marginTop: 16 }}>
        <ToggleSection
          id="ded-c"
          emoji="📒"
          title="80C basket & NPS 80CCD(1B)"
          subtitle="Tax-saving investments"
          oneLiner="Shared ₹1.5L 80C bucket plus optional ₹50k extra NPS — relevant only when old regime wins."
          isOn={i.secDed80c}
          onToggle={(v) => update({ secDed80c: v })}
        >
          <View style={styles.runningBox}>
            <Text style={styles.runningText}>
              80C running total {rupees(raw80C)} · Applied{" "}
              {rupees(s.running80C)} / ₹1,50,000
            </Text>
            <TaxTeachTooltip content={TEACH.deductions.eightyCRunning} />
          </View>
          <Mt
            id="tax-c-elss"
            label="ELSS / 80C equity"
            teach={TEACH.deductions.eightyCElss}
            optional
            value={i.c80Elss}
            max={150000}
            onChange={(n) => update({ c80Elss: n })}
          />
          <Mt
            id="tax-c-ppf"
            label="PPF"
            teach={TEACH.deductions.eightyCPpf}
            optional
            value={i.c80Ppf}
            max={150000}
            onChange={(n) => update({ c80Ppf: n })}
          />
          <Mt
            id="tax-c-lic"
            label="LIC / insurance (80C basket)"
            teach={TEACH.deductions.eightyCLic}
            optional
            value={i.c80Lic}
            max={150000}
            onChange={(n) => update({ c80Lic: n })}
          />
          <Mt
            id="tax-c-epf"
            label="EPF / employee PF"
            teach={TEACH.deductions.eightyCEpf}
            optional
            value={i.c80Epf}
            max={150000}
            onChange={(n) => update({ c80Epf: n })}
          />
          <Mt
            id="tax-c-tuition"
            label="Tuition fees"
            teach={TEACH.deductions.eightyCTuition}
            optional
            value={i.c80Tuition}
            max={150000}
            onChange={(n) => update({ c80Tuition: n })}
          />
          <Mt
            id="tax-c-principal"
            label="Home loan principal"
            teach={TEACH.deductions.eightyCHomePrincipal}
            optional
            value={i.c80Principal}
            max={150000}
            onChange={(n) => update({ c80Principal: n })}
          />
          <Mt
            id="tax-nps"
            label="80CCD(1B) NPS additional"
            teach={TEACH.deductions.eightyCCD}
            max={50000}
            value={i.nps80CCD1B}
            onChange={(n) => update({ nps80CCD1B: n })}
          />
        </ToggleSection>

        <ToggleSection
          id="ded-d"
          emoji="🩺"
          title="80D medical insurance"
          subtitle="Self & parents premiums"
          oneLiner="Self cap follows your age (₹25k / ₹50k). Parents cap needs parents’ age — ₹50k if 60+."
          isOn={i.secDed80d}
          onToggle={(v) => update({ secDed80d: v })}
        >
          <Mt
            id="tax-80d-self"
            label={`80D — self / spouse / kids (cap ₹${formatIndian(s.self80DCap)})`}
            teach={TEACH.deductions.eightyDSelf}
            max={s.self80DCap}
            value={i.deductions80DSelf}
            onChange={(n) => update({ deductions80DSelf: n })}
          />
          <TaxNumberInput
            label="Age of oldest parent"
            value={i.parentsAge}
            onChange={s.setParentsAgeValue}
            min={0}
            max={120}
            step={1}
            placeholder="e.g. 62"
            helper="As of FY end (31 Mar). Under 60 → parents 80D cap ₹25,000; 60+ → ₹50,000."
          />
          <Text style={[tx.xsMuted, styles.mb12]}>
            Parents 80D cap applied: ₹{formatIndian(s.parents80DCap)}
            {i.parentsAge > 0
              ? s.parentsSeniorEffective
                ? " (senior parents)"
                : " (parents under 60)"
              : " — enter parent age above for the right cap"}
          </Text>
          <Mt
            id="tax-80d-par"
            label={`80D — parents (cap ₹${formatIndian(s.parents80DCap)})`}
            teach={TEACH.deductions.eightyDParents}
            max={s.parents80DCap}
            optional
            value={i.deductions80DParents}
            onChange={(n) => update({ deductions80DParents: n })}
          />
        </ToggleSection>

        <ToggleSection
          id="ded-rest"
          emoji="📑"
          title="Other Chapter VI-A & 24(b)"
          subtitle="Remaining deductions"
          oneLiner="Donations, disability, education-loan interest, first-home boosts, and ₹2L housing-loan interest slices."
          isOn={i.secDedRest}
          onToggle={(v) => update({ secDedRest: v })}
        >
          <Mt
            id="tax-80dd"
            label="80DD"
            teach={TEACH.deductions.eightyDD}
            max={125000}
            optional
            value={i.deduction80DD}
            onChange={(n) => update({ deduction80DD: n })}
          />
          <Mt
            id="tax-80ddb"
            label="80DDB"
            teach={TEACH.deductions.eightyDDB}
            max={i.age >= 60 ? 100000 : 40000}
            optional
            value={i.deduction80DDB}
            onChange={(n) => update({ deduction80DDB: n })}
          />
          <Mt
            id="tax-80e"
            label="80E education loan interest"
            teach={TEACH.deductions.eightyE}
            optional
            value={i.deduction80E}
            max={500000000}
            onChange={(n) => update({ deduction80E: n })}
          />
          <Mt
            id="tax-80eea"
            label="80EEA"
            teach={TEACH.deductions.eightyEEA}
            max={150000}
            optional
            value={i.deduction80EEA}
            onChange={(n) => update({ deduction80EEA: n })}
          />
          <Mt
            id="tax-80g"
            label="80G donations"
            teach={TEACH.deductions.eightyG}
            optional
            value={i.deduction80G}
            max={500000000}
            onChange={(n) => update({ deduction80G: n })}
          />
          <Mt
            id="tax-80tta"
            label="80TTA"
            teach={TEACH.deductions.eightyTTA}
            max={10000}
            optional
            disabled={i.age >= 60}
            value={i.deduction80TTA}
            onChange={(n) => update({ deduction80TTA: n })}
          />
          <Mt
            id="tax-80ttb"
            label="80TTB"
            teach={TEACH.deductions.eightyTTB}
            max={50000}
            optional
            value={i.deduction80TTB}
            onChange={(n) => update({ deduction80TTB: n })}
          />
          <Mt
            id="tax-80u"
            label="80U"
            teach={TEACH.deductions.eightyU}
            max={125000}
            optional
            value={i.deduction80U}
            onChange={(n) => update({ deduction80U: n })}
          />
          <Mt
            id="tax-80rrb"
            label="80RRB royalty"
            teach={TEACH.deductions.eightyRRB}
            max={300000}
            optional
            value={i.deduction80RRB}
            onChange={(n) => update({ deduction80RRB: n })}
          />
          <Mt
            id="tax-24b"
            label="24(b) home loan interest"
            teach={TEACH.deductions.twentyFourB}
            max={200000}
            optional
            value={i.homeLoanInterest24b}
            onChange={(n) => update({ homeLoanInterest24b: n })}
          />
          <Mt
            id="tax-pt"
            label="Professional tax"
            teach={TEACH.deductions.professionalTax}
            max={5000}
            optional
            value={i.professionalTax}
            onChange={(n) => update({ professionalTax: n })}
          />
          <View style={styles.stdBox}>
            <TaxTeachTooltip
              content={TEACH.deductions.standardOld}
              ariaLabel="Standard deduction old"
            />
            <View style={styles.stdText}>
              <Text style={tx.xsMuted}>
                Old regime ₹50k standard deduction; new regime ₹75k in this
                tool (
              </Text>
              <TaxTeachTooltip
                content={TEACH.deductions.standardNew}
                ariaLabel="Standard deduction new"
              />
              <Text style={tx.xsMuted}>).</Text>
            </View>
          </View>
        </ToggleSection>
      </View>
    </StepCard>
  );
}

const styles = StyleSheet.create({
  runningBox: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEDFE",
    backgroundColor: "#FAFAFE",
    padding: 12,
  },
  runningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: "#534AB7",
  },
  mb12: { marginBottom: 12 },
  stdBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E8E6F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stdText: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
  },
});
