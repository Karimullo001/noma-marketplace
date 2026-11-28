import { z } from "zod";

export const uzPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+998[0-9]{9}$/, "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak");

export const smsSendSchema = z.object({
  phone: uzPhoneSchema,
});

export const smsVerifySchema = z.object({
  phone: uzPhoneSchema,
  token: z.string().trim().min(4, "Tasdiqlash kodini kiriting").max(8),
  fullName: z.string().trim().min(2).max(100).optional(),
});

export const sellerApplySchema = z.object({
  fullName: z.string().trim().min(2, "Ism familiyangiz kamida 2 ta harf bo'lishi kerak").max(100),
});

export const verifyInvitationCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Taklif kodini to'liq kiriting")
    .max(32, "Kod juda uzun")
    .regex(/^[A-Za-z0-9-]+$/, "Kod faqat harf, raqam va chiziqchadan iborat bo'lishi mumkin"),
});

export const storeCreateSchema = z.object({
  name: z.string().trim().min(2, "Do'kon nomi kamida 2 ta belgi bo'lishi kerak").max(80),
  description: z.string().trim().min(10, "Tavsif kamida 10 ta belgi bo'lishi kerak").max(1000),
  address: z.string().trim().min(5, "Manzilni aniq kiriting").max(200),
  city: z.string().trim().default("Namangan"),
  category: z.string().trim().min(2, "Do'kon yo'nalishini tanlang").max(80),
  phone: uzPhoneSchema,
  logo_url: z.string().url().optional().nullable().or(z.literal("")),
  banner_url: z.string().url().optional().nullable().or(z.literal("")),
  working_hours: z.string().trim().max(100).optional(),
  telegram: z.string().trim().max(80).optional(),
  instagram: z.string().trim().max(80).optional(),
});

export const productVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  size: z.string().trim().min(1, "O'lcham kiriting").max(20),
  color: z.string().trim().min(1, "Rang nomini kiriting").max(30),
  color_hex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  sku: z.string().trim().max(40).optional().nullable(),
  stock_quantity: z.coerce.number().int().min(0, "Qoldiq manfiy bo'lishi mumkin emas").max(100000),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(3, "Mahsulot nomi kamida 3 ta belgi").max(140),
    description: z.string().trim().min(10, "Tavsif kamida 10 ta belgi").max(3000),
    category_id: z.string().uuid("Bo'limni tanlang"),
    brand_name: z.string().trim().max(60).optional(),
    gender: z.enum(["men", "women", "children", "sport", "accessories", "unisex"]),
    material: z.string().trim().max(120).optional(),
    condition: z.enum(["new", "like_new"]).default("new"),
    base_price: z.coerce.number().positive("Narx 0 dan katta bo'lishi kerak").max(100000000),
    discount_price: z.coerce.number().positive().optional().nullable(),
    images: z.array(z.string().url()).min(1, "Kamida 1 ta rasm yuklang").max(8),
    variants: z.array(productVariantInputSchema).min(1, "Kamida 1 ta o'lcham/rang varianti kiriting"),
  })
  .refine(
    (data) => !data.discount_price || data.discount_price < data.base_price,
    { message: "Chegirmali narx asosiy narxdan kichik bo'lishi kerak", path: ["discount_price"] }
  );

export const fastStockUpdateSchema = z.object({
  variant_id: z.string().uuid(),
  stock_quantity: z.coerce.number().int().min(0).max(100000),
});

export const cartAddSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(50),
});

export const cartUpdateSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(50),
});

export const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "Ismingizni kiriting").max(100),
  customer_phone: uzPhoneSchema,
  delivery_city: z.string().trim().min(2).default("Namangan"),
  delivery_address: z.string().trim().min(5, "Yetkazib berish manzilini to'liq kiriting").max(300),
  delivery_notes: z.string().trim().max(500).optional(),
  payment_method: z.enum(["cash_on_delivery", "card_on_delivery"]),
  offer_accepted: z.literal(true, {
    errorMap: () => ({ message: "Buyurtma berish uchun ommaviy oferta shartlariga rozilik bildiring" }),
  }),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "preparing", "ready", "shipped", "delivered", "cancelled"]),
  delivery_fee: z.coerce.number().min(0).max(1000000).optional(),
  estimated_time: z.string().trim().max(120).optional(),
  delivery_method: z.string().trim().max(120).optional(),
  courier_contact: z.string().trim().max(120).optional(),
  tracking_note: z.string().trim().max(300).optional(),
});

export const reviewCreateSchema = z.object({
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3, "Fikringizni yozing").max(1000),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  parent_id: z.string().uuid().optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  display_order: z.coerce.number().int().min(0).default(0),
});
