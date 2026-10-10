import { Text, View } from "react-native";
import { TEACH } from "@/lib/taxTeachContent";
import { ToggleSection } from "../ToggleSection";
import { inr, rupees } from "./format";
import { Checkbox, Chip, ChipRow, Mt, tx } from "./primitives";
import type { TaxCalcState } from "./useTaxCalculatorState";
import { themedStyles, Colors } from "@/constants/theme";

export function OtherIncomeSections({ s }: { s: TaxCalcState }) {
  const { i, update, derived } = s;
  const rb = derived.rentalBreakdown;

  return (
    <>
      <ToggleSection
        id="biz"
        emoji="💼"
        title="Business income"
        subtitle="Business / profession"
        oneLiner="Pick actual books or presumptive (44AD/44ADA) — you generally shouldn’t mix expense claims with presumptive."
        isOn={i.secBusiness}
        onToggle={(v) => update({ secBusiness: v })}
      >
        <ChipRow style={styles.mb8}>
          <Chip
            active={i.bizMode === "regular"}
            label="Regular (actuals)"
            onPress={() => update({ bizMode: "regular" })}
          />
          <Chip
            active={i.bizMode === "44ad"}
            label="44AD presumptive"
            onPress={() => update({ bizMode: "44ad" })}
          />
          <Chip
            active={i.bizMode === "44ada"}
            label="44ADA presumptive"
            onPress={() => update({ bizMode: "44ada" })}
          />
        </ChipRow>
        {i.bizMode === "regular" ? (
          <>
            <Mt
              id="tax-biz-gross"
              label="Gross receipts"
              teach={TEACH.income.businessProfit}
              optional
              value={i.bizGrossReceipts}
              max={500000000}
              onChange={(n) => update({ bizGrossReceipts: n })}
            />
            <Mt
              id="tax-biz-exp"
              label="Expenses"
              teach={TEACH.income.businessProfit}
              optional
              value={i.bizExpenses}
              max={500000000}
              onChange={(n) => update({ bizExpenses: n })}
            />
          </>
        ) : null}
        {i.bizMode === "44ad" ? (
          <>
            <Mt
              id="tax-biz-to"
              label="Annual turnover"
              teach={TEACH.income.businessProfit}
              optional
              value={i.bizTurnover44AD}
              max={500000000}
              onChange={(n) => update({ bizTurnover44AD: n })}
            />
            <Checkbox
              checked={i.bizDigital44AD}
              onChange={(v) => update({ bizDigital44AD: v })}
              label="Mostly digital receipts (use 6% presumptive)"
            />
          </>
        ) : null}
        {i.bizMode === "44ada" ? (
          <Mt
            id="tax-biz-ada"
            label="Professional receipts"
            teach={TEACH.income.businessProfit}
            optional
            value={i.bizReceipts44ADA}
            max={500000000}
            onChange={(n) => update({ bizReceipts44ADA: n })}
          />
        ) : null}
        <Text style={tx.smStrong}>
          Net / presumptive income ≈ {rupees(derived.businessProfit)}
        </Text>
        <Text style={tx.xsMuted}>
          Presumptive schemes limit expense claims — confirm eligibility.
        </Text>
      </ToggleSection>

      <ToggleSection
        id="rental"
        emoji="🏢"
        title="Rental income"
        subtitle="Rent from property"
        oneLiner="Let-out workflow: NAV minus statutory 30% and interest on rental loan before slab tax."
        isOn={i.secRental}
        onToggle={(v) => update({ secRental: v })}
      >
        <Mt
          id="tax-rent-gross"
          label="Annual rent received"
          teach={TEACH.income.rentalIncome}
          optional
          value={i.rentAnnualGross}
          max={500000000}
          onChange={(n) => update({ rentAnnualGross: n })}
        />
        <Mt
          id="tax-rent-mun"
          label="Municipal taxes paid"
          teach={TEACH.income.rentalIncome}
          optional
          value={i.rentMunicipal}
          max={500000000}
          onChange={(n) => update({ rentMunicipal: n })}
        />
        <Mt
          id="tax-rent-loan"
          label="Home loan interest (let-out)"
          teach={TEACH.income.rentalIncome}
          optional
          value={i.rentLoanInterest}
          max={500000000}
          onChange={(n) => update({ rentLoanInterest: n })}
        />
        {rb ? (
          <View style={styles.gap4}>
            <Text style={tx.xs}>Gross ₹{inr(rb.grossRent)}</Text>
            <Text style={tx.xs}>Less municipal ₹{inr(rb.lessMunicipal)}</Text>
            <Text style={tx.xs}>NAV ₹{inr(Math.round(rb.nav))}</Text>
            <Text style={tx.xs}>Less 30% ₹{inr(Math.round(rb.less30))}</Text>
            <Text style={tx.xs}>Less interest ₹{inr(rb.lessInterest)}</Text>
            <Text style={[tx.xs, styles.strong]}>
              Taxable rental ₹{inr(derived.rentalTaxable)}
            </Text>
          </View>
        ) : null}
      </ToggleSection>

      <ToggleSection
        id="pension"
        emoji="🏖️"
        title="Pension income"
        subtitle="Pension or family pension"
        oneLiner="Monthly pension is ordinary income; commuted / family pension apply simplified exemption math here."
        isOn={i.secPension}
        onToggle={(v) => update({ secPension: v })}
      >
        <ChipRow style={styles.mb8}>
          <Chip
            active={i.pensionKind === "government"}
            label="Government service"
            onPress={() => update({ pensionKind: "government" })}
          />
          <Chip
            active={i.pensionKind === "private"}
            label="Private pension"
            onPress={() => update({ pensionKind: "private" })}
          />
          <Chip
            active={i.pensionKind === "family"}
            label="Family pension"
            onPress={() => update({ pensionKind: "family" })}
          />
        </ChipRow>
        {i.pensionKind === "family" ? (
          <Mt
            id="tax-fam-pen"
            label="Monthly family pension"
            teach={TEACH.income.familyPension}
            optional
            value={i.familyPensionMonthly}
            max={500000000}
            onChange={(n) => update({ familyPensionMonthly: n })}
          />
        ) : (
          <>
            <Mt
              id="tax-pen"
              label="Monthly pension"
              teach={TEACH.income.pension}
              optional
              value={i.pensionMonthly}
              max={500000000}
              onChange={(n) => update({ pensionMonthly: n })}
            />
            <Mt
              id="tax-comm"
              label="Commuted pension received (lump sum)"
              teach={TEACH.income.pension}
              optional
              value={i.commutedPension}
              max={500000000}
              onChange={(n) => update({ commutedPension: n })}
            />
          </>
        )}
        <Text style={tx.xsMuted}>
          Tool applies simple exemption sketches on commuted / family pension —
          confirm Form 16 treatment.
        </Text>
      </ToggleSection>

      <ToggleSection
        id="interest"
        emoji="🏦"
        title="Interest income"
        subtitle="Savings, FD, bonds"
        oneLiner="Splitting savings vs FD interest helps the planner nudge 80TTA vs manual slab inclusion."
        isOn={i.secInterest}
        onToggle={(v) => update({ secInterest: v })}
      >
        <Mt
          id="tax-int-sav"
          label="Savings account interest"
          helper="80TTA / 80TTB may offset small slices."
          teach={TEACH.income.interestIncome}
          optional
          value={i.savingsInterest}
          max={500000000}
          onChange={(n) => update({ savingsInterest: n })}
        />
        <Mt
          id="tax-int-fd"
          label="FD / RD interest"
          teach={TEACH.income.interestIncome}
          optional
          value={i.fdInterest}
          max={500000000}
          onChange={(n) => update({ fdInterest: n })}
        />
        <Mt
          id="tax-int-po"
          label="Post office interest"
          teach={TEACH.income.interestIncome}
          optional
          value={i.postOfficeInterest}
          max={500000000}
          onChange={(n) => update({ postOfficeInterest: n })}
        />
        <Mt
          id="tax-int-bond"
          label="Bond / debenture interest"
          teach={TEACH.income.interestIncome}
          optional
          value={i.bondsInterest}
          max={500000000}
          onChange={(n) => update({ bondsInterest: n })}
        />
        <Text style={tx.smStrong}>
          Total interest ₹{inr(derived.interestIncome)}
        </Text>
      </ToggleSection>

      <ToggleSection
        id="div"
        emoji="💰"
        title="Dividend income"
        subtitle="Stocks / MF / foreign"
        oneLiner="Post-2020 dividends sit in your slab; tag foreign flows if DTAA withholding applies."
        isOn={i.secDividend}
        onToggle={(v) => update({ secDividend: v })}
      >
        <Mt
          id="tax-div-in"
          label="Indian companies"
          teach={TEACH.income.dividendIncome}
          optional
          value={i.divIndian}
          max={500000000}
          onChange={(n) => update({ divIndian: n })}
        />
        <Mt
          id="tax-div-fr"
          label="Foreign companies"
          teach={TEACH.income.dividendIncome}
          optional
          value={i.divForeign}
          max={500000000}
          onChange={(n) => update({ divForeign: n })}
        />
        <Text style={tx.xsMuted}>
          Dividends taxable at slab; TDS may apply over thresholds.
        </Text>
      </ToggleSection>

      <ToggleSection
        id="cg"
        emoji="📊"
        title="Capital gains"
        subtitle="Equity, debt MF, property"
        oneLiner="Equity follows illustrative schedule rates; debt/property STCG slices here ride ordinary slab totals."
        isOn={i.secCG}
        onToggle={(v) => update({ secCG: v })}
      >
        <Mt
          id="tax-cg-eq-st"
          label="Equity STCG gains"
          helper="Illustrative 20% in engine."
          teach={TEACH.income.otherStcg}
          optional
          value={i.cgEquityStcgExtra}
          max={500000000}
          onChange={(n) => update({ cgEquityStcgExtra: n })}
        />
        <Mt
          id="tax-cg-eq-lt"
          label="Equity LTCG gains"
          helper="₹1.25L exemption then 12.5% illustrative."
          teach={TEACH.income.otherLtcg}
          optional
          value={i.cgEquityLtcgExtra}
          max={500000000}
          onChange={(n) => update({ cgEquityLtcgExtra: n })}
        />
        <Mt
          id="tax-cg-debt-st"
          label="Debt MF / similar STCG (slab)"
          teach={TEACH.income.otherStcg}
          optional
          value={i.cgDebtStcg}
          max={500000000}
          onChange={(n) => update({ cgDebtStcg: n })}
        />
        <Mt
          id="tax-cg-debt-lt"
          label="Debt MF LTCG (slab illustration)"
          teach={TEACH.income.otherLtcg}
          optional
          value={i.cgDebtLtcg}
          max={500000000}
          onChange={(n) => update({ cgDebtLtcg: n })}
        />
        <Mt
          id="tax-cg-prop-st"
          label="Property STCG (slab illustration)"
          teach={TEACH.income.otherStcg}
          optional
          value={i.cgPropStcg}
          max={500000000}
          onChange={(n) => update({ cgPropStcg: n })}
        />
        <Mt
          id="tax-cg-prop-lt"
          label="Property LTCG (12.5% illustrative)"
          teach={TEACH.income.otherLtcg}
          optional
          value={i.cgPropLtcg}
          max={500000000}
          onChange={(n) => update({ cgPropLtcg: n })}
        />
        <Text style={tx.xs}>
          Equity schedule tax ₹{inr(s.equityCgTaxOnly)} · LTCG exemption band
          used ₹{inr(Math.round(s.ltcgExemptionUsed))} / ₹1,25,000
        </Text>
      </ToggleSection>

      <ToggleSection
        id="agri"
        emoji="🌾"
        title="Agricultural income"
        subtitle="Farming / agri (planning toggle)"
        oneLiner="Section 10(1) exempt in principle — we optionally exclude it from ordinary gross; integration not modeled."
        isOn={i.secAgri}
        onToggle={(v) => update({ secAgri: v })}
      >
        <Mt
          id="tax-agri"
          label="Annual agricultural income"
          teach={TEACH.income.agriculturalIncome}
          optional
          value={i.agriculturalIncome}
          max={500000000}
          onChange={(n) => update({ agriculturalIncome: n })}
        />
        <Checkbox
          checked={i.excludeAgriculturalFromTax}
          onChange={(v) => update({ excludeAgriculturalFromTax: v })}
          label="Exclude from ordinary gross in this planner (partial integration not modeled)"
        />
      </ToggleSection>

      <ToggleSection
        id="other"
        emoji="💫"
        title="Other income"
        subtitle="Lottery, gifts, commission…"
        oneLiner="Lottery taxed at flat illustrative 30%; gifts/commission only if you mark them taxable."
        isOn={i.secOther}
        onToggle={(v) => update({ secOther: v })}
      >
        <Mt
          id="tax-lot"
          label="Lottery / gambling winnings"
          helper="30% flat illustrative tax."
          teach={TEACH.sections.income}
          optional
          value={i.lotteryIncome}
          max={500000000}
          onChange={(n) => update({ lotteryIncome: n })}
        />
        <Mt
          id="tax-gift"
          label="Taxable gifts (net)"
          teach={TEACH.sections.income}
          optional
          value={i.giftsTaxable}
          max={500000000}
          onChange={(n) => update({ giftsTaxable: n })}
        />
        <Mt
          id="tax-comm-inc"
          label="Commission"
          teach={TEACH.income.freelanceIncome}
          optional
          value={i.commissionIncome}
          max={500000000}
          onChange={(n) => update({ commissionIncome: n })}
        />
        <Mt
          id="tax-oth-misc"
          label="Other taxable income"
          teach={TEACH.sections.income}
          optional
          value={i.otherMiscIncome}
          max={500000000}
          onChange={(n) => update({ otherMiscIncome: n })}
        />
      </ToggleSection>
    </>
  );
}

const styles = themedStyles(() => ({
  mb8: { marginBottom: 8 },
  gap4: { gap: 4 },
  strong: { fontWeight: "600", color: Colors.textPrimary },
}));
