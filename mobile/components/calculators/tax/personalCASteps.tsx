import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatIndian } from "@/lib/formatters";
import { TEACH } from "@/lib/taxTeachContent";
import {
  Checkbox,
  Chip,
  ChipRow,
  Mt,
  TaxNumberInput,
  tx,
} from "./primitives";
import { EMPLOYMENT_OPTIONS, type TaxCalcState } from "./useTaxCalculatorState";

export const PERSONAL_CA_TOTAL_STEPS = 19;

export type CAChecklist = {
  salary: boolean;
  form16: boolean;
  interest: boolean;
  dividends: boolean;
  investments: boolean;
  rentLoan: boolean;
  gains: boolean;
};

export const EMPTY_CA_CHECKLIST: CAChecklist = {
  salary: false,
  form16: false,
  interest: false,
  dividends: false,
  investments: false,
  rentLoan: false,
  gains: false,
};

const CHECKLIST_ITEMS: [keyof CAChecklist, string][] = [
  ["salary", "Latest salary slips + Form 16 (if available)"],
  ["interest", "Savings, FD/RD, post office and bond interest totals"],
  ["dividends", "Dividend totals (Indian and foreign companies)"],
  [
    "investments",
    "Tax-saving proof: PF, PPF, ELSS, LIC, tuition, home principal, NPS",
  ],
  [
    "rentLoan",
    "Rent paid, HRA details, and home-loan interest/principal details",
  ],
  ["gains", "Capital gains summary (equity/debt/property, STCG/LTCG)"],
  [
    "form16",
    "Any deduction proofs: medical, donation, education loan, disability, royalty, etc.",
  ],
];

export function personalCASection(step: number) {
  if (step === 0) return "Get ready";
  if (step <= 2) return "Profile & income";
  if (step <= 10) return "Income details";
  if (step <= 16) return "Deductions";
  return "Review";
}

function Q({ children }: { children: ReactNode }) {
  return <Text style={[tx.smDark, styles.q]}>{children}</Text>;
}

function YesNo({
  on,
  setOn,
  yes = "Yes",
  no = "No",
}: {
  on: boolean;
  setOn: (v: boolean) => void;
  yes?: string;
  no?: string;
}) {
  return (
    <ChipRow style={styles.block}>
      <Chip active={on} label={yes} onPress={() => setOn(true)} />
      <Chip active={!on} label={no} onPress={() => setOn(false)} />
    </ChipRow>
  );
}

export function PersonalCAStepBody({
  s,
  step,
  checklist,
  setChecklist,
  checklistReady,
}: {
  s: TaxCalcState;
  step: number;
  checklist: CAChecklist;
  setChecklist: (fn: (prev: CAChecklist) => CAChecklist) => void;
  checklistReady: boolean;
}) {
  const { i, update } = s;

  switch (step) {
    case 0:
      return (
        <View style={styles.gap12}>
          <Text style={tx.smDark}>
            Before we start, keep these details ready so your Personal CA flow
            is accurate.
          </Text>
          {CHECKLIST_ITEMS.map(([k, label]) => (
            <Checkbox
              key={k}
              boxed
              checked={checklist[k]}
              onChange={(v) => setChecklist((prev) => ({ ...prev, [k]: v }))}
              label={label}
            />
          ))}
          {!checklistReady ? (
            <Text style={styles.warn}>Please tick all items to continue.</Text>
          ) : null}
        </View>
      );

    case 1:
      return (
        <View>
          <Q>What best describes you?</Q>
          <Text style={[tx.hint, styles.block]}>
            Select one or more — many people have multiple sources of income.
          </Text>
          <ChipRow style={styles.blockLg}>
            {EMPLOYMENT_OPTIONS.map((opt) => (
              <Chip
                key={`ca-${opt.id}`}
                active={i.employments.includes(opt.id)}
                label={opt.label}
                onPress={() => s.toggleEmployment(opt.id)}
              />
            ))}
          </ChipRow>
          <TaxNumberInput
            label="Your age"
            value={i.age}
            onChange={(n) => update({ age: n })}
            min={18}
            max={100}
            step={1}
          />
          <Checkbox
            checked={s.parentsSeniorEffective}
            onChange={s.setParentsSeniorChecked}
            label="Parents 60+ (higher 80D parents cap)"
          />
          <Checkbox
            checked={i.nri}
            onChange={(v) => update({ nri: v })}
            label="NRI / overseas tie"
          />
        </View>
      );

    case 2:
      return (
        <View>
          <Q>Let us capture your core income first.</Q>
          <Mt
            id="ca-basic"
            label="Monthly basic salary"
            teach={TEACH.income.basicMonthly}
            value={i.basicMonthly}
            onChange={(n) => update({ basicMonthly: n })}
          />
          <Mt
            id="ca-special"
            label="Monthly special allowance"
            teach={TEACH.income.allowancesMonthly}
            optional
            value={i.specialAllowanceMonthly}
            onChange={(n) => update({ specialAllowanceMonthly: n })}
          />
          <Mt
            id="ca-meal-voucher"
            label="Meal card/coupon (monthly)"
            teach={TEACH.income.allowancesMonthly}
            optional
            value={i.mealVoucherMonthly}
            onChange={(n) => update({ mealVoucherMonthly: n })}
          />
          <TaxNumberInput
            label="Eligible meal days/month"
            value={i.mealVoucherWorkDaysPerMonth}
            onChange={(n) => update({ mealVoucherWorkDaysPerMonth: n })}
            min={0}
            max={31}
            step={1}
          />
          <Checkbox
            checked={i.mealVoucherUse200Cap}
            onChange={(v) => update({ mealVoucherUse200Cap: v })}
            label="Use revised cap ₹200/meal (off = ₹50/meal)"
            style={styles.block}
          />
          <Mt
            id="ca-free"
            label="Freelance/professional income (annual)"
            teach={TEACH.income.freelanceIncome}
            optional
            value={i.freelanceIncome}
            onChange={(n) => update({ freelanceIncome: n })}
          />
        </View>
      );

    case 3:
      return (
        <View>
          <Q>
            Do you receive HRA from employer?{" "}
            <Text style={styles.qMuted}>(Sec 10(13A))</Text>
          </Q>
          <YesNo
            on={i.secHRA}
            setOn={(v) =>
              update(v ? { secHRA: true, sec80GG: false } : { secHRA: false })
            }
          />
          {i.secHRA ? (
            <>
              <Mt
                id="ca-hra"
                label="Monthly HRA received"
                teach={TEACH.income.hraMonthly}
                value={i.hraMonthly}
                onChange={(n) => update({ hraMonthly: n })}
              />
              <Mt
                id="ca-rent"
                label="Monthly rent paid"
                teach={TEACH.deductions.eightyGG}
                value={i.rentPaidMonthly}
                onChange={(n) => update({ rentPaidMonthly: n })}
              />
              <ChipRow>
                <Chip
                  active={i.isMetro}
                  label="Metro city"
                  onPress={() => update({ isMetro: true })}
                />
                <Chip
                  active={!i.isMetro}
                  label="Non-metro city"
                  onPress={() => update({ isMetro: false })}
                />
              </ChipRow>
            </>
          ) : (
            <>
              <Text style={[tx.xsMuted, styles.blockLg]}>
                If you pay rent without HRA, this goes under Sec 80GG
                (illustrative cap up to ₹60,000).
              </Text>
              <Mt
                id="ca-rent-no-hra"
                label="Annual rent paid without HRA (Sec 80GG)"
                teach={TEACH.deductions.eightyGG}
                optional
                value={i.rentPaidNoHra}
                onChange={(n) => update({ rentPaidNoHra: n })}
              />
            </>
          )}
        </View>
      );

    case 4:
      return (
        <View>
          <Q>Now income from bank/investments.</Q>
          <Mt
            id="ca-sav-int"
            label="Savings account interest (Sec 80TTA/80TTB link)"
            teach={TEACH.income.interestIncome}
            optional
            value={i.savingsInterest}
            onChange={(n) => update({ savingsInterest: n })}
          />
          <Mt
            id="ca-fd-int"
            label="FD/RD interest"
            teach={TEACH.income.interestIncome}
            optional
            value={i.fdInterest}
            onChange={(n) => update({ fdInterest: n })}
          />
          <Mt
            id="ca-po-int"
            label="Post office interest"
            teach={TEACH.income.interestIncome}
            optional
            value={i.postOfficeInterest}
            onChange={(n) => update({ postOfficeInterest: n })}
          />
          <Mt
            id="ca-bond-int"
            label="Bond/debenture interest"
            teach={TEACH.income.interestIncome}
            optional
            value={i.bondsInterest}
            onChange={(n) => update({ bondsInterest: n })}
          />
          <Mt
            id="ca-div-ind"
            label="Dividend from Indian companies"
            teach={TEACH.income.dividendIncome}
            optional
            value={i.divIndian}
            onChange={(n) => update({ divIndian: n })}
          />
          <Mt
            id="ca-div-foreign"
            label="Dividend from foreign companies"
            teach={TEACH.income.dividendIncome}
            optional
            value={i.divForeign}
            onChange={(n) => update({ divForeign: n })}
          />
        </View>
      );

    case 5:
      return (
        <View>
          <Q>
            Did you receive Leave Travel Allowance?{" "}
            <Text style={styles.qMuted}>(LTA / Sec 10(5))</Text>
          </Q>
          <YesNo on={i.secLTA} setOn={(v) => update({ secLTA: v })} />
          {i.secLTA ? (
            <>
              <Mt
                id="ca-lta-recv"
                label="Annual LTA received"
                teach={TEACH.income.ltaTaxable}
                optional
                value={i.ltaAnnualRecv}
                onChange={(n) => update({ ltaAnnualRecv: n })}
              />
              <Checkbox
                checked={i.ltaClaiming}
                onChange={(v) => update({ ltaClaiming: v })}
                label="Claiming travel this year?"
                style={styles.block}
              />
              {i.ltaClaiming ? (
                <Mt
                  id="ca-lta-cost"
                  label="Actual travel cost used for claim"
                  teach={TEACH.income.ltaExempt}
                  optional
                  value={i.ltaTravelCost}
                  onChange={(n) => update({ ltaTravelCost: n })}
                />
              ) : null}
            </>
          ) : null}
        </View>
      );

    case 6:
      return (
        <View>
          <Q>Any RSU / ESOP vesting or sale this year?</Q>
          <YesNo on={i.secRSU} setOn={(v) => update({ secRSU: v })} />
          {i.secRSU ? (
            <>
              <TaxNumberInput
                label="Units vested this FY"
                value={i.rsuUnits}
                onChange={(n) => update({ rsuUnits: n })}
                min={0}
                step={1}
              />
              <Mt
                id="ca-rsu-fmv"
                label="FMV per vested unit"
                teach={TEACH.income.rsuVesting}
                optional
                value={i.rsuFmvPerUnit}
                onChange={(n) => update({ rsuFmvPerUnit: n })}
              />
              <Checkbox
                checked={i.rsuPlanSell}
                onChange={(v) => update({ rsuPlanSell: v })}
                label="Sold vested units?"
                style={styles.block}
              />
              {i.rsuPlanSell ? (
                <>
                  <TaxNumberInput
                    label="Units sold"
                    value={i.rsuUnitsSold}
                    onChange={(n) => update({ rsuUnitsSold: n })}
                    min={0}
                    step={1}
                  />
                  <Mt
                    id="ca-rsu-sale-px"
                    label="Sale price per unit"
                    teach={TEACH.income.rsuSaleStcg}
                    optional
                    value={i.rsuSalePrice}
                    onChange={(n) => update({ rsuSalePrice: n })}
                  />
                  <Mt
                    id="ca-rsu-cost-px"
                    label="Cost/FMV per unit at vest"
                    teach={TEACH.income.rsuSaleLtcg}
                    optional
                    value={i.rsuCostPrice}
                    onChange={(n) => update({ rsuCostPrice: n })}
                  />
                  <ChipRow>
                    <Chip
                      active={i.rsuShortTerm}
                      label="Short-term"
                      onPress={() => update({ rsuShortTerm: true })}
                    />
                    <Chip
                      active={!i.rsuShortTerm}
                      label="Long-term"
                      onPress={() => update({ rsuShortTerm: false })}
                    />
                  </ChipRow>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      );

    case 7:
      return (
        <View>
          <Q>
            Any leave encashment received this year?{" "}
            <Text style={styles.qMuted}>(Sec 10(10AA))</Text>
          </Q>
          <YesNo on={i.secLeave} setOn={(v) => update({ secLeave: v })} />
          {i.secLeave ? (
            <>
              <ChipRow style={styles.block}>
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
              <ChipRow style={styles.blockLg}>
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
                id="ca-leave-amt"
                label="Leave encashment amount received"
                teach={TEACH.income.leaveEncashmentTaxable}
                optional
                value={i.leaveReceived}
                onChange={(n) => update({ leaveReceived: n })}
              />
              <Mt
                id="ca-leave-avg"
                label="Average monthly salary for calc"
                teach={TEACH.income.leaveEncashmentTaxable}
                optional
                value={i.leaveAvgMonthly}
                onChange={(n) => update({ leaveAvgMonthly: n })}
              />
              <TaxNumberInput
                label="Accumulated leave days"
                value={i.leaveDays}
                onChange={(n) => update({ leaveDays: n })}
                min={0}
                step={1}
              />
            </>
          ) : null}
        </View>
      );

    case 8:
      return (
        <View>
          <Q>Any rental income from property?</Q>
          <YesNo on={i.secRental} setOn={(v) => update({ secRental: v })} />
          {i.secRental ? (
            <>
              <Mt
                id="ca-rent-gross"
                label="Annual rent received"
                teach={TEACH.income.rentalIncome}
                optional
                value={i.rentAnnualGross}
                onChange={(n) => update({ rentAnnualGross: n })}
              />
              <Mt
                id="ca-rent-muni"
                label="Municipal taxes paid"
                teach={TEACH.income.rentalIncome}
                optional
                value={i.rentMunicipal}
                onChange={(n) => update({ rentMunicipal: n })}
              />
              <Mt
                id="ca-rent-int"
                label="Home loan interest (let-out)"
                teach={TEACH.income.rentalIncome}
                optional
                value={i.rentLoanInterest}
                onChange={(n) => update({ rentLoanInterest: n })}
              />
            </>
          ) : null}
        </View>
      );

    case 9:
      return (
        <View>
          <Q>
            Any capital gains this year? If yes, fill all applicable buckets.
          </Q>
          <YesNo on={i.secCG} setOn={(v) => update({ secCG: v })} />
          {i.secCG ? (
            <>
              <Mt
                id="ca-cg-eq-st"
                label="Equity STCG gains (illustrative 20%)"
                teach={TEACH.income.otherStcg}
                optional
                value={i.cgEquityStcgExtra}
                onChange={(n) => update({ cgEquityStcgExtra: n })}
              />
              <Mt
                id="ca-cg-eq-lt"
                label="Equity LTCG gains (₹1.25L exemption then 12.5%)"
                teach={TEACH.income.otherLtcg}
                optional
                value={i.cgEquityLtcgExtra}
                onChange={(n) => update({ cgEquityLtcgExtra: n })}
              />
              <Mt
                id="ca-cg-debt-st"
                label="Debt STCG (slab)"
                teach={TEACH.income.otherStcg}
                optional
                value={i.cgDebtStcg}
                onChange={(n) => update({ cgDebtStcg: n })}
              />
              <Mt
                id="ca-cg-debt-lt"
                label="Debt LTCG (slab in this planner)"
                teach={TEACH.income.otherLtcg}
                optional
                value={i.cgDebtLtcg}
                onChange={(n) => update({ cgDebtLtcg: n })}
              />
              <Mt
                id="ca-cg-prop-st"
                label="Property STCG (slab)"
                teach={TEACH.income.otherStcg}
                optional
                value={i.cgPropStcg}
                onChange={(n) => update({ cgPropStcg: n })}
              />
              <Mt
                id="ca-cg-prop-lt"
                label="Property LTCG (illustrative 12.5%)"
                teach={TEACH.income.otherLtcg}
                optional
                value={i.cgPropLtcg}
                onChange={(n) => update({ cgPropLtcg: n })}
              />
            </>
          ) : null}
        </View>
      );

    case 10:
      return (
        <View>
          <Q>Any other taxable income or agricultural income to include?</Q>
          <YesNo
            on={i.secOther}
            setOn={(v) => update({ secOther: v })}
            yes="Other income: Yes"
            no="Other income: No"
          />
          {i.secOther ? (
            <>
              <Mt
                id="ca-lottery"
                label="Lottery/gambling winnings (flat 30% illustrative)"
                teach={TEACH.sections.income}
                optional
                value={i.lotteryIncome}
                onChange={(n) => update({ lotteryIncome: n })}
              />
              <Mt
                id="ca-gift"
                label="Taxable gifts"
                teach={TEACH.sections.income}
                optional
                value={i.giftsTaxable}
                onChange={(n) => update({ giftsTaxable: n })}
              />
              <Mt
                id="ca-comm"
                label="Commission income"
                teach={TEACH.income.freelanceIncome}
                optional
                value={i.commissionIncome}
                onChange={(n) => update({ commissionIncome: n })}
              />
              <Mt
                id="ca-omisc"
                label="Other taxable income"
                teach={TEACH.sections.income}
                optional
                value={i.otherMiscIncome}
                onChange={(n) => update({ otherMiscIncome: n })}
              />
            </>
          ) : null}
          <YesNo
            on={i.secAgri}
            setOn={(v) => update({ secAgri: v })}
            yes="Agricultural income: Yes"
            no="Agricultural income: No"
          />
          {i.secAgri ? (
            <>
              <Mt
                id="ca-agri"
                label="Annual agricultural income"
                teach={TEACH.income.agriculturalIncome}
                optional
                value={i.agriculturalIncome}
                onChange={(n) => update({ agriculturalIncome: n })}
              />
              <Checkbox
                checked={i.excludeAgriculturalFromTax}
                onChange={(v) => update({ excludeAgriculturalFromTax: v })}
                label="Exclude from ordinary taxable gross in this planner"
              />
            </>
          ) : null}
        </View>
      );

    case 11:
      return (
        <View>
          <Q>
            80C means tax-saving investments like PF, PPF, ELSS, LIC, tuition
            fee, home-loan principal. Cap: ₹1,50,000. Extra NPS 80CCD(1B) cap:
            ₹50,000.
            <Text style={styles.qMuted}> (Sec 80C / 80CCD(1B))</Text>
          </Q>
          <Mt
            id="ca-epf"
            label="EPF / PF contribution"
            teach={TEACH.deductions.eightyCEpf}
            optional
            value={i.c80Epf}
            onChange={(n) => update({ c80Epf: n })}
          />
          <Mt
            id="ca-ppf"
            label="PPF contribution"
            teach={TEACH.deductions.eightyCPpf}
            optional
            value={i.c80Ppf}
            onChange={(n) => update({ c80Ppf: n })}
          />
          <Mt
            id="ca-elss"
            label="ELSS investment"
            teach={TEACH.deductions.eightyCElss}
            optional
            value={i.c80Elss}
            onChange={(n) => update({ c80Elss: n })}
          />
          <Mt
            id="ca-lic"
            label="LIC premium"
            teach={TEACH.deductions.eightyCLic}
            optional
            value={i.c80Lic}
            onChange={(n) => update({ c80Lic: n })}
          />
          <Mt
            id="ca-tuition"
            label="Eligible tuition fee"
            teach={TEACH.deductions.eightyCTuition}
            optional
            value={i.c80Tuition}
            onChange={(n) => update({ c80Tuition: n })}
          />
          <Mt
            id="ca-principal"
            label="Home-loan principal repaid"
            teach={TEACH.deductions.eightyCHomePrincipal}
            optional
            value={i.c80Principal}
            onChange={(n) => update({ c80Principal: n })}
          />
          <Mt
            id="ca-nps"
            label="Extra NPS (Sec 80CCD(1B))"
            teach={TEACH.deductions.eightyCCD}
            optional
            value={i.nps80CCD1B}
            onChange={(n) => update({ nps80CCD1B: n })}
          />
        </View>
      );

    case 12:
      return (
        <View>
          <Q>
            Health insurance premiums (Sec 80D). Self/family cap ₹
            {formatIndian(s.self80DCap)} from your age. Parents cap depends on
            parent age: ₹25,000 under 60, ₹50,000 if 60+.
          </Q>
          <Mt
            id="ca-80d-self"
            label={`Self/spouse/kids premium (cap ₹${formatIndian(s.self80DCap)})`}
            teach={TEACH.deductions.eightyDSelf}
            max={s.self80DCap}
            optional
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
            helper="As of FY end (31 Mar). 60+ unlocks ₹50,000 parents premium cap."
          />
          <Text style={[tx.xsMuted, styles.blockLg]}>
            Parents 80D cap applied: ₹{formatIndian(s.parents80DCap)}
            {i.parentsAge > 0
              ? s.parentsSeniorEffective
                ? " (senior parents)"
                : " (parents under 60)"
              : " — enter age for the correct cap"}
          </Text>
          <Mt
            id="ca-80d-parent"
            label={`Parents premium (cap ₹${formatIndian(s.parents80DCap)})`}
            teach={TEACH.deductions.eightyDParents}
            max={s.parents80DCap}
            optional
            value={i.deductions80DParents}
            onChange={(n) => update({ deductions80DParents: n })}
          />
        </View>
      );

    case 13:
      return (
        <View>
          <Q>
            Housing loan deductions. Sec 24(b) cap: ₹2,00,000. Sec 80EEA cap:
            ₹1,50,000.
          </Q>
          <Mt
            id="ca-24b"
            label="Home loan interest on self-occupied house (Sec 24(b))"
            teach={TEACH.deductions.twentyFourB}
            optional
            value={i.homeLoanInterest24b}
            onChange={(n) => update({ homeLoanInterest24b: n })}
          />
          <Mt
            id="ca-80eea"
            label="Additional affordable housing interest (Sec 80EEA)"
            teach={TEACH.deductions.eightyEEA}
            optional
            value={i.deduction80EEA}
            onChange={(n) => update({ deduction80EEA: n })}
          />
        </View>
      );

    case 14:
      return (
        <View>
          <Q>Education loan and donations.</Q>
          <Mt
            id="ca-80e"
            label="Education loan interest paid (Sec 80E)"
            teach={TEACH.deductions.eightyE}
            optional
            value={i.deduction80E}
            onChange={(n) => update({ deduction80E: n })}
          />
          <Mt
            id="ca-80g"
            label="Eligible donations (Sec 80G)"
            teach={TEACH.deductions.eightyG}
            optional
            value={i.deduction80G}
            onChange={(n) => update({ deduction80G: n })}
          />
        </View>
      );

    case 15:
      return (
        <View>
          <Q>
            Disability and medical-condition deductions. 80DD cap: ₹1,25,000.
            80DDB cap: ₹40,000 or ₹1,00,000 (senior). 80U cap: ₹1,25,000.
          </Q>
          <Mt
            id="ca-80dd"
            label="Dependent disability (Sec 80DD)"
            teach={TEACH.deductions.eightyDD}
            optional
            value={i.deduction80DD}
            onChange={(n) => update({ deduction80DD: n })}
          />
          <Mt
            id="ca-80ddb"
            label="Specified disease treatment (Sec 80DDB)"
            teach={TEACH.deductions.eightyDDB}
            optional
            value={i.deduction80DDB}
            onChange={(n) => update({ deduction80DDB: n })}
          />
          <Mt
            id="ca-80u"
            label="Self disability deduction (Sec 80U)"
            teach={TEACH.deductions.eightyU}
            optional
            value={i.deduction80U}
            onChange={(n) => update({ deduction80U: n })}
          />
        </View>
      );

    case 16:
      return (
        <View>
          <Q>
            Interest/royalty/prof-tax deductions. 80TTA cap ₹10k (non-senior),
            80TTB cap ₹50k, 80RRB cap ₹3,00,000, professional tax cap ₹5,000.
          </Q>
          <Mt
            id="ca-80tta"
            label="Savings account interest deduction (Sec 80TTA)"
            teach={TEACH.deductions.eightyTTA}
            optional
            disabled={i.age >= 60}
            value={i.deduction80TTA}
            onChange={(n) => update({ deduction80TTA: n })}
          />
          <Mt
            id="ca-80ttb"
            label="Senior citizen interest deduction (Sec 80TTB)"
            teach={TEACH.deductions.eightyTTB}
            optional
            value={i.deduction80TTB}
            onChange={(n) => update({ deduction80TTB: n })}
          />
          <Mt
            id="ca-80rrb"
            label="Royalty income deduction (Sec 80RRB)"
            teach={TEACH.deductions.eightyRRB}
            optional
            value={i.deduction80RRB}
            onChange={(n) => update({ deduction80RRB: n })}
          />
          <Mt
            id="ca-prof-tax"
            label="Professional tax paid"
            teach={TEACH.deductions.professionalTax}
            optional
            value={i.professionalTax}
            onChange={(n) => update({ professionalTax: n })}
          />
        </View>
      );

    case 17:
      return (
        <View style={styles.gap12}>
          <Text style={tx.smDark}>Quick review before calculation</Text>
          <View style={styles.reviewBox}>
            <Text style={tx.sm}>
              Salary captured: ₹
              {Math.round(
                (i.basicMonthly + i.specialAllowanceMonthly) * 12,
              ).toLocaleString("en-IN")}{" "}
              yearly base
            </Text>
            <Text style={tx.sm}>
              80C+NPS total entered: ₹
              {(
                i.c80Elss +
                i.c80Ppf +
                i.c80Lic +
                i.c80Epf +
                i.c80Tuition +
                i.c80Principal +
                i.nps80CCD1B
              ).toLocaleString("en-IN")}
            </Text>
            <Text style={tx.sm}>
              80D total entered: ₹
              {(i.deductions80DSelf + i.deductions80DParents).toLocaleString(
                "en-IN",
              )}
            </Text>
            <Text style={tx.sm}>
              Other deductions entered: ₹
              {(
                i.deduction80DD +
                i.deduction80DDB +
                i.deduction80E +
                i.deduction80EEA +
                i.deduction80G +
                i.deduction80TTA +
                i.deduction80TTB +
                i.deduction80U +
                i.deduction80RRB +
                i.homeLoanInterest24b
              ).toLocaleString("en-IN")}
            </Text>
          </View>
          <Text style={tx.xsMuted}>
            You can go back and edit any answer. We will not change tax logic,
            only fill fields.
          </Text>
        </View>
      );

    default:
      return (
        <View style={styles.gap12}>
          <Text style={tx.smDark}>
            Done. I have filled your tax form fields from this Personal CA flow.
          </Text>
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>
              Next step: tap <Text style={{ fontWeight: "600" }}>Calculate</Text>{" "}
              in Step 5 results to compare old vs new regime.
            </Text>
          </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  q: { marginBottom: 12 },
  qMuted: { color: "#7A7871", fontWeight: "400" },
  block: { marginBottom: 8 },
  blockLg: { marginBottom: 12 },
  gap12: { gap: 12 },
  warn: { fontSize: 12, color: "#B45309" },
  reviewBox: {
    gap: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ECEAF8",
    backgroundColor: "#FAFAFE",
    padding: 12,
  },
  doneBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  doneText: { fontSize: 14, lineHeight: 20, color: "#064E3B" },
});
