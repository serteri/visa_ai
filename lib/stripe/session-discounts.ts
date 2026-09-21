import type Stripe from "stripe";

/**
 * Promotion-code / coupon identifiers applied to a Checkout session, read from Stripe (server-side).
 *
 * The webhook event carries a session whose `discounts` are unexpanded ids, so the session is re-retrieved
 * with the discount objects expanded. Returned strings are the promotion code text plus the coupon id and
 * name, so an "ADMINFREE" promotion code AND an "ADMINFREE" coupon both show up (callers compare
 * case-insensitively). A lookup failure returns whatever was read so far (usually nothing) and warns without
 * any customer data: the caller then treats the order as a normal one, so a Stripe outage can never silently
 * swallow a real customer's email.
 */
export async function getSessionPromotionCodes(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string[]> {
  const found = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (value && value.trim()) found.add(value.trim());
  };

  const addCoupon = (coupon: string | Stripe.Coupon | null | undefined) => {
    if (!coupon) return;
    if (typeof coupon === "string") add(coupon);
    else {
      add(coupon.id);
      add(coupon.name);
    }
  };

  const addPromotionCode = async (promotionCode: string | Stripe.PromotionCode | null | undefined) => {
    if (!promotionCode) return;
    if (typeof promotionCode === "string") {
      const looked = await stripe.promotionCodes.retrieve(promotionCode);
      add(looked.code);
    } else {
      add(promotionCode.code);
    }
  };

  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["discounts.promotion_code", "discounts.coupon", "total_details.breakdown"],
    });

    for (const discount of full.discounts ?? []) {
      addCoupon(discount.coupon);
      await addPromotionCode(discount.promotion_code);
    }
    // The applied-discount breakdown: the shape differs between Stripe API versions (coupon directly on the
    // discount, or under `source`), so read it loosely rather than trusting one typing.
    type LooseDiscount = {
      coupon?: string | Stripe.Coupon | null;
      promotion_code?: string | Stripe.PromotionCode | null;
      source?: { coupon?: string | Stripe.Coupon | null } | null;
    };
    for (const entry of full.total_details?.breakdown?.discounts ?? []) {
      const applied = entry.discount as unknown as LooseDiscount;
      addCoupon(applied.coupon);
      addCoupon(applied.source?.coupon);
      await addPromotionCode(applied.promotion_code);
    }
  } catch (err) {
    console.warn("[session-discounts] could not read the session's discounts; treating any unread discount as absent:", err instanceof Error ? err.message : "unknown error");
  }

  return [...found];
}
