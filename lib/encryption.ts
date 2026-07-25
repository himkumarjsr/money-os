import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY not set in env");
  }
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes) for aes-256-gcm",
    );
  }
  return buf;
}

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
  version: number;
}

export function encrypt(data: object): EncryptedData {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const jsonStr = JSON.stringify(data);

  let encrypted = cipher.update(jsonStr, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    version: 1,
  };
}

export function decrypt(
  encryptedData: string,
  iv: string,
  authTag: string,
): Record<string, unknown> {
  const key = getKey();

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted) as Record<string, unknown>;
}

export function hashData(data: object): string {
  return createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .substring(0, 16);
}

/**
 * Encrypt only sensitive money fields from a health-check submission.
 * Uses Finkoin FinancialProfile field names (not legacy aliases).
 */
export function encryptSensitiveFields(
  submission: Record<string, unknown>,
): EncryptedData {
  const sensitiveFields = {
    monthlySalary: submission.monthlySalary,
    spouseIncome: submission.spouseIncome,
    otherIncome: submission.otherIncome,
    // expense totals (primary UI)
    foodTotal: submission.foodTotal,
    transportTotal: submission.transportTotal,
    utilityTotal: submission.utilityTotal,
    domesticHelpTotal: submission.domesticHelpTotal,
    lifestyleTotal: submission.lifestyleTotal,
    // liquid / investable balances
    savingsAccountBalance: submission.savingsAccountBalance,
    liquidMFValue: submission.liquidMFValue,
    totalEquityValue: submission.totalEquityValue,
    fdValue: submission.fdValue,
    ppfBalance: submission.ppfBalance,
    npsBalance: submission.npsBalance,
    epfBalance: submission.epfBalance,
    // debt outstanding
    homeLoanOutstanding: submission.homeLoanOutstanding,
    personalLoanOutstanding: submission.personalLoanOutstanding,
    carLoanOutstanding: submission.carLoanOutstanding,
    // insurance covers
    termInsuranceSumAssured: submission.termInsuranceSumAssured,
    healthInsuranceSumInsured: submission.healthInsuranceSumInsured,
    // monthly investing
    monthlySIP: submission.monthlySIP,
    monthlyRD: submission.monthlyRD,
    monthlyPPFContribution: submission.monthlyPPFContribution,
    monthlyNPSContribution: submission.monthlyNPSContribution,
    monthlyEPFContribution: submission.monthlyEPFContribution,
  };

  return encrypt(sensitiveFields);
}
