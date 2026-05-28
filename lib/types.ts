export type CategorySlug =
  | "drinks"
  | "snacks"
  | "meals"
  | "halo-halo"
  | "rice-meals"
  | "shakes-soda"
  | "school-essentials";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending_verification" | "verified" | "rejected";
export type FulfillmentType = "pickup" | "delivery";

export type Category = {
  id: string;
  name: string;
  slug: CategorySlug;
  sort_order: number;
};

export type ProductOption = {
  name: string;
  price: number;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  is_popular: boolean;
  prep_time_minutes: number;
  options: ProductOption[];
  sold_today?: number;
  category?: Category;
};

export type CartItem = {
  product: Product;
  quantity: number;
  selectedOptions: ProductOption[];
  note?: string;
};

export type StoreSettings = {
  store_name: string;
  store_open: boolean;
  opening_time: string;
  closing_time: string;
  delivery_fee: number;
  gcash_name: string;
  gcash_number: string;
  gcash_qr_url: string;
  default_prep_minutes: number;
  banner_url: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  options_total: number;
  selected_options: ProductOption[];
  note?: string | null;
};

export type Payment = {
  id: string;
  order_id: string;
  status: PaymentStatus;
  gcash_reference?: string | null;
  screenshot_url?: string | null;
  amount: number;
};

export type Order = {
  id: string;
  queue_number: number;
  customer_name: string;
  contact_number: string;
  grade_section?: string | null;
  fulfillment_type: FulfillmentType;
  desired_time: string;
  notes?: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  estimated_ready_at?: string | null;
  created_at: string;
  order_items?: OrderItem[];
  payments?: Payment[];
};

export type Analytics = {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  completedOrders: number;
  mostOrderedProduct: string;
  dailySales: { label: string; revenue: number; orders: number }[];
  bestSellers: { name: string; sold: number }[];
  busyHours: { hour: string; orders: number }[];
};
