import { Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { formatIndian } from "@/lib/formatters";
import { TEACH } from "@/lib/taxTeachContent";
import { TaxTeachTooltip } from "../TaxTeachTooltip";
import { Checkbox, Chip, ChipRow, StepCard, tx } from "./primitives";
import { EMPLOYMENT_OPTIONS, type TaxCalcState } from "./useTaxCalculatorState";
import { themedStyles, Colors, brand } from "@/constants/theme";

export function ProfileStep({ s }: { s: TaxCalcState }) {
  const { i, update } = s;
  return (
    <StepCard
      title="Step 1 · Profile & person type"
      teach={TEACH.sections.profile}
      blurb="Age and employment shape slab brackets; flags tune deduction caps (80D, 80TTB) and hints."
    >
      <View style={styles.body}>
        <View>
          <Text style={[tx.smLabel, { marginBottom: 4 }]}>
            Work / income style
          </Text>
          <Text style={[tx.hint, { marginBottom: 8 }]}>
            Pick all that apply — you can have more than one source of income.
          </Text>
          <ChipRow>
            {EMPLOYMENT_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                active={i.employments.includes(opt.id)}
                label={opt.label}
                onPress={() => s.toggleEmployment(opt.id)}
              />
            ))}
          </ChipRow>
        </View>
        <View style={styles.flags}>
          <Checkbox
            checked={i.widowed}
            onChange={(v) => update({ widowed: v })}
            label="Widowed"
          />
          <Checkbox
            checked={i.disabledSelf}
            onChange={(v) => update({ disabledSelf: v })}
            label="Self disability"
          />
          <Checkbox
            checked={i.nri}
            onChange={(v) => update({ nri: v })}
            label="NRI / overseas tie"
          />
          <Checkbox
            checked={s.parentsSeniorEffective}
            onChange={s.setParentsSeniorChecked}
            label={`Parents 60+ (80D parents cap ₹${formatIndian(s.parents80DCap)})`}
          />
        </View>
        <View>
          <View style={styles.ageLabel}>
            <Text style={tx.smLabel}>Age</Text>
            <TaxTeachTooltip
              content={TEACH.sections.profile}
              ariaLabel="Age bands"
            />
          </View>
          <Slider
            style={styles.slider}
            minimumValue={18}
            maximumValue={100}
            step={1}
            value={i.age}
            onValueChange={(v) => update({ age: Math.round(v) })}
            minimumTrackTintColor={brand("#534AB7")}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={brand("#534AB7")}
            accessibilityLabel="Age"
          />
          <Text style={[tx.hint, styles.ageText]}>
            {i.age} yrs —{" "}
            {i.age >= 80
              ? "super senior"
              : i.age >= 60
                ? "senior citizen"
                : "regular"}
          </Text>
        </View>
      </View>
    </StepCard>
  );
}

const styles = themedStyles(() => ({
  body: { marginTop: 16, gap: 16 },
  flags: { gap: 0 },
  ageLabel: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slider: { width: "100%", height: 36 },
  ageText: { marginTop: 4, textAlign: "right" },
}));
