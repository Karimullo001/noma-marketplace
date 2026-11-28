import { describe, it, expect } from "vitest";
import {
  generateOneTimeSellerCode,
  hashInvitationCode,
  getCodePrefix,
} from "@/lib/security/code-hash";
import {
  uzPhoneSchema,
  verifyInvitationCodeSchema,
  productFormSchema,
  checkoutSchema,
} from "@/lib/validation/schemas";
import {
  formatPrice,
  isTransitionAllowedForSeller,
} from "@/lib/utils";
import { initializePayment } from "@/lib/payments/provider";
import { isAdminEmail } from "@/lib/config";

describe("Seller Invitation Code Security", () => {
  it("generates unique cryptographically random codes", () => {
    const c1 = generateOneTimeSellerCode();
    const c2 = generateOneTimeSellerCode();
    expect(c1).toMatch(/^NOMA-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(c2).toMatch(/^NOMA-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(c1).not.toBe(c2);
  });

  it("hashes codes deterministically with case-insensitive normalization", () => {
    const code = "NOMA-7K4M-9P2X";
    expect(hashInvitationCode(code)).toBe(hashInvitationCode(" noma-7k4m-9p2x "));
    expect(hashInvitationCode(code)).not.toBe(code);
    expect(getCodePrefix(code)).toBe("NOMA-7K4M-****");
  });
});

describe("Zod Validation Schemas", () => {
  it("validates Uzbekistan phone numbers", () => {
    expect(uzPhoneSchema.safeParse("+998901234567").success).toBe(true);
    expect(uzPhoneSchema.safeParse("901234567").success).toBe(false);
    expect(uzPhoneSchema.safeParse("+99890123").success).toBe(false);
  });

  it("rejects discount price >= base price", () => {
    const res = productFormSchema.safeParse({
      name: "Paxta ko'ylak",
      description: "Namanganda tikilgan sifatli paxta ko'ylak",
      category_id: "11111111-0001-0000-0000-000000000002",
      gender: "men",
      condition: "new",
      base_price: 200000,
      discount_price: 250000,
      images: ["https://example.com/a.jpg"],
      variants: [{ size: "M", color: "Oq", stock_quantity: 5 }],
    });
    expect(res.success).toBe(false);
  });

  it("enforces supported delivery payment methods and offer acceptance at checkout", () => {
    const validCash = checkoutSchema.safeParse({
      customer_name: "Ali Valiyev",
      customer_phone: "+998901234567",
      delivery_city: "Namangan",
      delivery_address: "Boburshoh ko'chasi 14",
      payment_method: "cash_on_delivery",
      offer_accepted: true,
    });
    expect(validCash.success).toBe(true);

    const validCard = checkoutSchema.safeParse({
      customer_name: "Ali Valiyev",
      customer_phone: "+998901234567",
      delivery_city: "Namangan",
      delivery_address: "Boburshoh ko'chasi 14",
      payment_method: "card_on_delivery",
      offer_accepted: true,
    });
    expect(validCard.success).toBe(true);

    const invalidMethod = checkoutSchema.safeParse({
      customer_name: "Ali Valiyev",
      customer_phone: "+998901234567",
      delivery_city: "Namangan",
      delivery_address: "Boburshoh ko'chasi 14",
      payment_method: "click",
      offer_accepted: true,
    });
    expect(invalidMethod.success).toBe(false);

    const missingOffer = checkoutSchema.safeParse({
      customer_name: "Ali Valiyev",
      customer_phone: "+998901234567",
      delivery_city: "Namangan",
      delivery_address: "Boburshoh ko'chasi 14",
      payment_method: "cash_on_delivery",
    });
    expect(missingOffer.success).toBe(false);
  });

  it("rejects malformed invitation codes", () => {
    expect(verifyInvitationCodeSchema.safeParse({ code: "NOMA-1234-ABCD" }).success).toBe(true);
    expect(verifyInvitationCodeSchema.safeParse({ code: "ab" }).success).toBe(false);
    expect(verifyInvitationCodeSchema.safeParse({ code: "bad code!" }).success).toBe(false);
  });
});

describe("Order Status Transitions & Payments", () => {
  it("enforces seller order transition state machine", () => {
    expect(isTransitionAllowedForSeller("pending", "accepted")).toBe(true);
    expect(isTransitionAllowedForSeller("pending", "rejected")).toBe(true);
    expect(isTransitionAllowedForSeller("pending", "delivered")).toBe(false);
    expect(isTransitionAllowedForSeller("shipped", "delivered")).toBe(true);
    expect(isTransitionAllowedForSeller("delivered", "cancelled")).toBe(false);
  });

  it("never marks COD payments as paid automatically", () => {
    const res = initializePayment("cash_on_delivery");
    expect(res.supported).toBe(true);
    expect(res.status).toBe("unpaid");
  });

  it("formats UZS currency properly", () => {
    expect(formatPrice(250000)).toBe("250 000 so'm");
    expect(formatPrice(0)).toBe("0 so'm");
  });

  it("checks ADMIN_EMAILS case-insensitively", () => {
    process.env.ADMIN_EMAILS = "Owner@Gmail.com, second@noma.uz";
    expect(isAdminEmail("owner@gmail.com")).toBe(true);
    expect(isAdminEmail("hacker@gmail.com")).toBe(false);
  });
});
