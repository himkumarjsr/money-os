import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddObligationForm from "@/components/tracker/AddObligationForm";
import { categoryFromTitle, endMonthAfter } from "@/lib/billsCalendar";

describe("AddObligationForm months left", () => {
  it("saves an end month from the months left", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddObligationForm
        onSave={onSave}
        onClose={() => {}}
        initial={{
          title: "RD for health premium",
          category: "insurance_rd",
          amount: 2000,
          frequency: "monthly",
          due_day: 5,
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Months left/), {
      target: { value: "4" },
    });
    expect(screen.getByText(/Last payment in/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].end_month).toBe(endMonthAfter(4));
  });

  it("prefills months left when editing and clears to no end", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddObligationForm
        onSave={onSave}
        onClose={() => {}}
        initial={{
          title: "Car loan",
          category: "loan_emi",
          amount: 9000,
          frequency: "monthly",
          due_day: 10,
          end_month: endMonthAfter(6),
        }}
      />,
    );
    const input = screen.getByLabelText(/Months left/) as HTMLInputElement;
    expect(input.value).toBe("6");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].end_month).toBeNull();
  });
});

describe("AddObligationForm category from title", () => {
  it("guesses common categories", () => {
    expect(categoryFromTitle("Car insurance")).toBe("insurance_vehicle");
    expect(categoryFromTitle("Star health premium")).toBe("insurance_health");
    expect(categoryFromTitle("LIC policy")).toBe("insurance_life");
    expect(categoryFromTitle("HDFC home loan")).toBe("loan_emi");
    expect(categoryFromTitle("Gym")).toBeNull();
  });

  it("files a new 'Car insurance' as vehicle insurance, not a loan", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AddObligationForm onSave={onSave} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/What is it/), {
      target: { value: "Car insurance" },
    });
    fireEvent.change(screen.getByLabelText(/Amount/), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save|Add/ }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].category).toBe("insurance_vehicle");
  });

  it("keeps a category the person tapped", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddObligationForm
        onSave={onSave}
        onClose={() => {}}
        initial={{ title: "Car loan", category: "loan_emi", amount: 9000 }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/What is it/), {
      target: { value: "Car loan insurance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].category).toBe("loan_emi");
  });
});
