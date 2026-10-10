import { Text, View } from "react-native";
import {
  rsuSaleGain,
  rsuVestingIncomeAnnual,
} from "@/lib/taxCalculatorHelpers";
import { TEACH } from "@/lib/taxTeachContent";
import { ToggleSection } from "../ToggleSection";
import { inr, rupees } from "./format";
import {
  Checkbox,
  Chip,
  ChipRow,
  InfoBox,
  Mt,
  TaxNumberInput,
  tx,
} from "./primitives";
import type { TaxCalcState } from "./useTaxCalculatorState";
import { themedStyles, Colors } from "@/constants/theme";

export function SalaryExtrasSections({ s }: { s: TaxCalcState }) {
  const { i, update, derived } = s;
  const rsuCost = i.rsuCostPrice > 0 ? i.rsuCostPrice : i.rsuFmvPerUnit;

  return (
    <>
      <ToggleSection
        id="job-switch"
        emoji="🔁"
        title="Job switch / Full & Final (mid-year)"
        subtitle="Changed employers this FY — Form 16 from both"
        oneLiner="Add previous employer taxable salary, F&F extras, and TDS already deducted so total tax and balance due stay accurate."
        isOn={i.secJobSwitch}
        onToggle={(v) => update({ secJobSwitch: v })}
      >
        <Text style={[tx.xsMuted, styles.mb8]}>
          Enter current employer monthly salary in Step 2 (for months worked
          there). Pull previous employer figures from their Form 16 Part B /
          F&amp;F sheet. Turn on Leave encashment and Gratuity below if those
          appeared in your settlement.
        </Text>
        <Mt
          id="tax-prev-employer-salary"
          label="Previous employer taxable salary (annual)"
          teach={TEACH.income.basicMonthly}
          optional
          value={i.prevEmployerSalaryAnnual}
          max={500000000}
          onChange={(n) => update({ prevEmployerSalaryAnnual: n })}
        />
        <Mt
          id="tax-ff-other"
          label="Other taxable F&F amounts (notice pay, taxable bonus, etc.)"
          teach={TEACH.income.leaveEncashmentTaxable}
          optional
          value={i.ffOtherTaxable}
          max={500000000}
          onChange={(n) => update({ ffOtherTaxable: n })}
        />
        <Mt
          id="tax-prev-tds"
          label="TDS deducted by previous employer"
          teach={TEACH.income.basicMonthly}
          optional
          value={i.prevEmployerTds}
          max={500000000}
          onChange={(n) => update({ prevEmployerTds: n })}
        />
        <Mt
          id="tax-curr-tds"
          label="TDS deducted by current employer"
          teach={TEACH.income.basicMonthly}
          optional
          value={i.currentEmployerTds}
          max={500000000}
          onChange={(n) => update({ currentEmployerTds: n })}
        />
        <InfoBox>
          Tip: Leave encashment / gratuity in F&amp;F → enable those toggles in
          this step. Dual Form 16s alone do not force ITR-2 if you only have
          salary (+ ITR-1 eligible income).
        </InfoBox>
      </ToggleSection>

      <ToggleSection
        id="hra"
        emoji="🏠"
        title="HRA — House Rent Allowance"
        subtitle="I receive HRA and pay rent"
        oneLiner="Uses rent paid, metro vs non-metro, and salary base for the 10% test — opens old-regime exemption math."
        isOn={i.secHRA}
        onToggle={(v) =>
          update(v ? { secHRA: true, sec80GG: false } : { secHRA: false })
        }
      >
        <Mt
          id="tax-hra-m"
          label="Monthly HRA received"
          teach={TEACH.income.hraMonthly}
          value={i.hraMonthly}
          max={10_000_000}
          onChange={(n) => update({ hraMonthly: n })}
        />
        <Mt
          id="tax-rent-m"
          label="Monthly rent paid"
          teach={TEACH.deductions.eightyGG}
          value={i.rentPaidMonthly}
          max={10_000_000}
          onChange={(n) => update({ rentPaidMonthly: n })}
        />
        <Text style={tx.smLabel}>City type</Text>
        <ChipRow style={styles.chipsBlock}>
          <Chip
            active={i.isMetro}
            label="Metro"
            onPress={() => update({ isMetro: true })}
          />
          <Chip
            active={!i.isMetro}
            label="Non-metro"
            onPress={() => update({ isMetro: false })}
          />
        </ChipRow>
        <Mt
          id="tax-hra-base-annual"
          label="Annual salary base for HRA 10% rule (optional)"
          helper="Leave ₹0 to use Basic×12."
          teach={TEACH.income.hraBaseAnnual}
          optional
          value={i.hraSalaryBaseAnnualOverride}
          max={500000000}
          onChange={(n) => update({ hraSalaryBaseAnnualOverride: n })}
        />
        {i.secHRA ? (
          <View style={styles.previewBox}>
            <Text style={tx.sm}>
              HRA exempt (illustrative): {rupees(s.hraExemptAnnualPreview / 12)}
              /mo
            </Text>
            <Text style={tx.sm}>
              Taxable HRA remainder: {rupees(s.hraTaxableAnnualPreview / 12)}/mo
            </Text>
          </View>
        ) : null}
      </ToggleSection>

      <ToggleSection
        id="80gg"
        emoji="🏠"
        title="Rent without HRA (80GG)"
        subtitle="I pay rent but don’t get HRA"
        oneLiner="Illustrative ₹60k / rent−10% income cap — only matters when old regime wins on deductions."
        isOn={i.sec80GG}
        onToggle={(v) =>
          update(v ? { sec80GG: true, secHRA: false } : { sec80GG: false })
        }
      >
        <Mt
          id="tax-rent-nohra"
          label="Annual rent paid"
          helper={`Illustrative 80GG ≈ ${rupees(s.ggPreview)}`}
          teach={TEACH.deductions.eightyGG}
          value={i.rentPaidNoHra}
          max={500000000}
          onChange={(n) => update({ rentPaidNoHra: n })}
        />
      </ToggleSection>

      <ToggleSection
        id="lta"
        emoji="✈️"
        title="LTA — Leave Travel Allowance"
        subtitle="I receive LTA from employer"
        oneLiner="Exemption tracks eligible domestic travel spend up to the allowance — payroll blocks still apply."
        isOn={i.secLTA}
        onToggle={(v) => update({ secLTA: v })}
      >
        <Mt
          id="tax-lta-recv"
          label="Annual LTA received"
          teach={TEACH.income.ltaTaxable}
          optional
          value={i.ltaAnnualRecv}
          max={500000000}
          onChange={(n) => update({ ltaAnnualRecv: n })}
        />
        <Checkbox
          checked={i.ltaClaiming}
          onChange={(v) => update({ ltaClaiming: v })}
          label="Claiming eligible travel this year?"
          style={styles.mb8}
        />
        {i.ltaClaiming ? (
          <Mt
            id="tax-lta-cost"
            label="Actual travel cost"
            teach={TEACH.income.ltaExempt}
            optional
            value={i.ltaTravelCost}
            max={500000000}
            onChange={(n) => update({ ltaTravelCost: n })}
          />
        ) : null}
        <Text style={tx.xsMuted}>
          LTA exemption needs domestic travel proofs; blocks are claim-limited —
          verify with payroll.
        </Text>
        <Text style={[tx.sm, styles.mt8]}>
          Exempt ₹{inr(derived.ltaExemptRec)} · Taxable ₹
          {inr(derived.ltaTaxable)}
        </Text>
      </ToggleSection>

      <ToggleSection
        id="rsu"
        emoji="📈"
        title="RSU / ESOP — Company shares"
        subtitle="RSUs or ESOPs vesting this year"
        oneLiner="FMV at vest flows like salary; later sales map into equity STCG/LTCG buckets in this model."
        isOn={i.secRSU}
        onToggle={(v) => update({ secRSU: v })}
      >
        <Text style={[tx.smLabel, styles.mb8]}>Listing (for your notes)</Text>
        <ChipRow style={styles.chipsBlock}>
          <Chip
            active={i.rsuListing === "india"}
            label="India listed"
            onPress={() => update({ rsuListing: "india" })}
          />
          <Chip
            active={i.rsuListing === "us"}
            label="US listed"
            onPress={() => update({ rsuListing: "us" })}
          />
          <Chip
            active={i.rsuListing === "other"}
            label="Other"
            onPress={() => update({ rsuListing: "other" })}
          />
        </ChipRow>
        <TaxNumberInput
          label="Units vesting this FY"
          value={i.rsuUnits}
          onChange={(n) => update({ rsuUnits: n })}
          min={0}
          step={1}
        />
        <Mt
          id="tax-rsu-fmv"
          label="FMV per unit on vest"
          teach={TEACH.income.rsuVesting}
          optional
          value={i.rsuFmvPerUnit}
          max={500000000}
          onChange={(n) => update({ rsuFmvPerUnit: n })}
        />
        <Text style={tx.smStrong}>
          RSU salary income ≈{" "}
          {rupees(rsuVestingIncomeAnnual(i.rsuUnits, i.rsuFmvPerUnit))}
        </Text>
        <Checkbox
          checked={i.rsuPlanSell}
          onChange={(v) => update({ rsuPlanSell: v })}
          label="Planning to sell vested units?"
          style={styles.mt8}
        />
        {i.rsuPlanSell ? (
          <View style={styles.mt8}>
            <TaxNumberInput
              label="Units sold"
              value={i.rsuUnitsSold}
              onChange={(n) => update({ rsuUnitsSold: n })}
              min={0}
              step={1}
            />
            <Mt
              id="tax-rsu-sale"
              label="Sale price per unit"
              teach={TEACH.income.rsuSaleStcg}
              optional
              value={i.rsuSalePrice}
              max={500000000}
              onChange={(n) => update({ rsuSalePrice: n })}
            />
            <Mt
              id="tax-rsu-cost"
              label="Cost / FMV per unit at vest"
              teach={TEACH.income.rsuSaleLtcg}
              optional
              value={rsuCost}
              max={500000000}
              onChange={(n) => update({ rsuCostPrice: n })}
            />
            <Text style={[tx.smLabel, styles.mb8]}>Holding bucket</Text>
            <ChipRow style={styles.mb8}>
              <Chip
                active={i.rsuShortTerm}
                label="Short-term (equity)"
                onPress={() => update({ rsuShortTerm: true })}
              />
              <Chip
                active={!i.rsuShortTerm}
                label="Long-term (equity)"
                onPress={() => update({ rsuShortTerm: false })}
              />
            </ChipRow>
            <Text style={tx.sm}>
              Gain ₹
              {inr(
                Math.max(
                  0,
                  rsuSaleGain(i.rsuUnitsSold, i.rsuSalePrice, rsuCost),
                ),
              )}{" "}
              → {i.rsuShortTerm ? "STCG bucket" : "LTCG bucket"}
            </Text>
          </View>
        ) : null}
      </ToggleSection>

      <ToggleSection
        id="gratuity"
        emoji="🎁"
        title="Gratuity"
        subtitle="Received gratuity this year"
        oneLiner="Government payouts modeled fully exempt; private sector uses ₹20L-aware illustrative formula."
        isOn={i.secGratuity}
        onToggle={(v) => update({ secGratuity: v })}
      >
        <ChipRow style={styles.chipsBlockSm}>
          <Chip
            active={i.gratEmployer === "government"}
            label="Government"
            onPress={() => update({ gratEmployer: "government" })}
          />
          <Chip
            active={i.gratEmployer === "private"}
            label="Private sector"
            onPress={() => update({ gratEmployer: "private" })}
          />
        </ChipRow>
        <Mt
          id="tax-grat-amt"
          label="Gratuity received"
          teach={TEACH.income.gratuityTaxable}
          optional
          value={i.gratReceived}
          max={500000000}
          onChange={(n) => update({ gratReceived: n })}
        />
        <TaxNumberInput
          label="Years of service"
          value={i.gratYears}
          onChange={(n) => update({ gratYears: n })}
          min={0}
          step={1}
        />
        <Mt
          id="tax-grat-salary"
          label="Last drawn salary (annual, for formula)"
          teach={TEACH.income.gratuityExempt}
          optional
          value={i.gratLastSalaryAnnual}
          max={500000000}
          onChange={(n) => update({ gratLastSalaryAnnual: n })}
        />
        <Text style={tx.sm}>
          Exempt ₹{inr(derived.gratuityExemptRec)} · Taxable ₹
          {inr(derived.gratuityTaxable)}
        </Text>
        <Text style={tx.xsMuted}>
          Private employees: ₹20L cumulative exemption ceiling applies — confirm
          notifications with payroll.
        </Text>
      </ToggleSection>

      <ToggleSection
        id="leave"
        emoji="🌴"
        title="Leave encashment"
        subtitle="Encashed leave this year"
        oneLiner="Retirement vs in-service paths change exemption sketches — confirm HR worksheets."
        isOn={i.secLeave}
        onToggle={(v) => update({ secLeave: v })}
      >
        <ChipRow style={styles.chipsBlockSm}>
          <Chip
            active={i.leaveTiming === "retirement"}
            label="At retirement"
            onPress={() => update({ leaveTiming: "retirement" })}
          />
          <Chip
            active={i.leaveTiming === "during_service"}
            label="During service"
            onPress={() => update({ leaveTiming: "during_service" })}
          />
        </ChipRow>
        <ChipRow style={styles.chipsBlockSm}>
          <Chip
            active={i.leaveEmployer === "government"}
            label="Government employer"
            onPress={() => update({ leaveEmployer: "government" })}
          />
          <Chip
            active={i.leaveEmployer === "private"}
            label="Private employer"
            onPress={() => update({ leaveEmployer: "private" })}
          />
        </ChipRow>
        <Mt
          id="tax-leave-amt"
          label="Amount received"
          teach={TEACH.income.leaveEncashmentTaxable}
          optional
          value={i.leaveReceived}
          max={500000000}
          onChange={(n) => update({ leaveReceived: n })}
        />
        <Mt
          id="tax-leave-avg"
          label="Avg monthly salary (last 10 months)"
          teach={TEACH.income.leaveEncashmentTaxable}
          optional
          value={i.leaveAvgMonthly}
          max={500000000}
          onChange={(n) => update({ leaveAvgMonthly: n })}
        />
        <TaxNumberInput
          label="Years of service"
          value={i.leaveYears}
          onChange={(n) => update({ leaveYears: n })}
          min={0}
          step={1}
        />
        <TaxNumberInput
          label="Accumulated leave days"
          value={i.leaveDays}
          onChange={(n) => update({ leaveDays: n })}
          min={0}
          step={1}
        />
        <Text style={tx.sm}>
          Exempt ₹{inr(derived.leaveExemptRec)} · Taxable ₹
          {inr(derived.leaveTaxable)}
        </Text>
        <Text style={tx.xsMuted}>
          Section 10(10AA) — illustrative split only.
        </Text>
      </ToggleSection>
    </>
  );
}

const styles = themedStyles(() => ({
  mb8: { marginBottom: 8 },
  mt8: { marginTop: 8 },
  chipsBlock: { marginTop: 8, marginBottom: 12 },
  chipsBlockSm: { marginBottom: 8 },
  previewBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
}));
