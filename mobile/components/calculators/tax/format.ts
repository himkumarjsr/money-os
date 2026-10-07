export function rupees(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function inr(n: number) {
  return n.toLocaleString("en-IN");
}
