export type ServiceCategory = "console" | "table" | "pc" | "vr" | "other" | string;
export type PaymentMethod = "Cash" | "UPI" | "Card" | "Bank";
export type SessionStatus = "active" | "completed" | "cancelled";

export interface Setting {
  key: string;
  value: string;
}

export interface Service {
  id: string;
  name: string;
  type: ServiceCategory;
}

export interface ServicePrice {
  id: string;
  service_id: string;
  duration_minutes: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface Session {
  id: string;
  customer_name: string;
  phone: string;
  service_id: string;
  start_time: number;
  expected_end_time: number;
  status: SessionStatus;
  base_charge: number;
  controllers: number;
  overtime_waived?: boolean;
}

export interface SessionExtension {
  id: string;
  session_id: string;
  added_duration: number;
  added_cost: number;
  timestamp: number;
}

export interface BillItem {
  id: string;
  bill_id: string;
  item_type: "gaming" | "food" | "overtime" | string;
  item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Bill {
  id: string;
  session_id: string;
  gaming_subtotal: number;
  food_subtotal: number;
  discount: number;
  final_amount: number;
  payment_method: PaymentMethod;
  status: "paid" | "unpaid" | "void" | string;
  created_at: number;
  items?: BillItem[];
  manual_override?: number | null;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  date: number;
}

export interface BillWithItems {
  bill: Bill;
  items: Omit<BillItem, "bill_id">[];
}

export interface ManagerData {
  settings: Setting[];
  services: Service[];
  service_prices: ServicePrice[];
  products: Product[];
  sessions: Session[];
  session_extensions: SessionExtension[];
  bills: Bill[];
  bill_items: BillItem[];
  expenses: Expense[];
}