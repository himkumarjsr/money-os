export function validatePAN(pan: string): boolean {
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return regex.test(pan.toUpperCase());
}

/**
 * Client-side check only: valid Indian PAN pattern (ABCDE1234F).
 * Does not call NSDL/income-tax APIs — those require authorised integrations.
 */
export async function verifyPAN(
  pan: string,
  _name: string,
): Promise<{ verified: boolean; message: string }> {
  const normalized = pan.trim().toUpperCase();
  if (!validatePAN(normalized)) {
    return {
      verified: false,
      message: "Enter a valid PAN (10 characters: five letters, four digits, one letter).",
    };
  }

  await new Promise((r) => setTimeout(r, 600));
  return {
    verified: true,
    message:
      "PAN format looks valid. We don’t verify against the income-tax database yet — full KYC checks will come when we plug in an authorised API.",
  };
}

