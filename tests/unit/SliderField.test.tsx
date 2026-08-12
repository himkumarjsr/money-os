import {
  CALCULATOR_MONEY_MAX,
  SliderField,
} from "@/components/calculators/calculator-ui";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

function RateHarness({
  initial = 12,
  onChangeSpy,
}: {
  initial?: number;
  onChangeSpy?: (v: number) => void;
}) {
  const [rate, setRate] = useState(initial);
  return (
    <SliderField
      label="Expected annual return"
      unitType="percent"
      value={rate}
      min={6}
      max={20}
      step={0.1}
      onChange={(v) => {
        setRate(v);
        onChangeSpy?.(v);
      }}
    />
  );
}

function MoneyHarness({
  initial = 10_000,
  onChangeSpy,
}: {
  initial?: number;
  onChangeSpy?: (v: number) => void;
}) {
  const [amount, setAmount] = useState(initial);
  return (
    <SliderField
      label="Monthly SIP"
      unitType="money"
      value={amount}
      min={500}
      max={CALCULATOR_MONEY_MAX}
      step={500}
      onChange={(v) => {
        setAmount(v);
        onChangeSpy?.(v);
      }}
    />
  );
}

describe("SliderField", () => {
  it("accepts decimal rate input and syncs the range slider", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<RateHarness onChangeSpy={spy} />);

    const input = screen.getByRole("textbox");
    const slider = screen.getByRole("slider");

    await user.clear(input);
    await user.type(input, "12.5");

    expect(spy).toHaveBeenCalledWith(12.5);
    expect(slider).toHaveValue("12.5");
    expect(screen.getByText("12.5% p.a.")).toBeInTheDocument();
  });

  it("keeps trailing decimal while typing without snapping away the dot", async () => {
    const user = userEvent.setup();
    render(<RateHarness initial={10} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "7.");

    // "7" live-syncs the slider; trailing "." must remain editable in the field.
    expect(input).toHaveValue("7.");
    expect(screen.getByRole("slider")).toHaveValue("7");
  });

  it("updates rate field when slider moves by a decimal step", () => {
    render(<RateHarness initial={12} />);
    const slider = screen.getByRole("slider");

    fireEvent.change(slider, { target: { value: "11.3" } });

    expect(screen.getByRole("textbox")).toHaveValue("11.3");
    expect(screen.getByText("11.3% p.a.")).toBeInTheDocument();
  });

  it("clamps money input to CALCULATOR_MONEY_MAX on blur", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<MoneyHarness onChangeSpy={spy} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "2000000000");
    await user.tab();

    expect(spy).toHaveBeenCalledWith(CALCULATOR_MONEY_MAX);
    expect(input).toHaveValue("99,00,00,000");
  });

  it("keeps exact money amounts that are off the slider step grid", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<MoneyHarness initial={10_000} onChangeSpy={spy} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "22500000");
    await user.tab();

    expect(spy).toHaveBeenCalledWith(22_500_000);
    expect(input).toHaveValue("2,25,00,000");
  });

  it("uses decimal inputMode for percent fields", () => {
    render(<RateHarness />);
    expect(screen.getByRole("textbox")).toHaveAttribute("inputMode", "decimal");
  });
});
