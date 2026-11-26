/**
 * Modular Payment Gateway Interface.
 * MVP supports ONLY Cash on Delivery ('cash_on_delivery') and never fakes paid transactions.
 * Click and Payme adapters can be implemented here once real merchant credentials exist.
 */
export type SupportedPaymentMethod = "cash_on_delivery" | "click" | "payme";

export interface PaymentInitResult {
  supported: boolean;
  provider: SupportedPaymentMethod;
  status: "unpaid" | "pending";
  redirectUrl?: string;
  message: string;
}

export function getAvailablePaymentMethods() {
  return [
    {
      id: "cash_on_delivery" as const,
      name: "Yetkazib berilganda to'lash",
      description: "Buyurtmani ko'rib, kiyib tekshirgandan so'ng naqd yoki karta orqali to'lang.",
      enabled: true,
    },
    {
      id: "click" as const,
      name: "Click (Tez kunda)",
      description: "Merchant integratsiyasi hali ulanmagan.",
      enabled: false,
    },
    {
      id: "payme" as const,
      name: "Payme (Tez kunda)",
      description: "Merchant integratsiyasi hali ulanmagan.",
      enabled: false,
    },
  ];
}

export function initializePayment(method: SupportedPaymentMethod): PaymentInitResult {
  if (method === "cash_on_delivery") {
    return {
      supported: true,
      provider: "cash_on_delivery",
      status: "unpaid",
      message: "To'lov buyurtma yetkazib berilganda amalga oshiriladi.",
    };
  }
  return {
    supported: false,
    provider: method,
    status: "unpaid",
    message: `${method.toUpperCase()} to'lov tizimi hali sozlanmagan.`,
  };
}
