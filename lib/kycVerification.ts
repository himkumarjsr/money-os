export function validatePAN(pan: string): boolean {
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return regex.test(pan.toUpperCase());
}

export async function verifyPAN(
  pan: string,
  _name: string,
): Promise<{ verified: boolean; message: string }> {
  if (!validatePAN(pan)) {
    return { verified: false, message: "Invalid PAN format" };
  }

  await new Promise((r) => setTimeout(r, 1500));
  return { verified: true, message: "PAN verified successfully" };
}

