/** Agent-portal money: the report and the commission are in Australian dollars. */
export function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", currencyDisplay: "code" }).format(amount);
}
