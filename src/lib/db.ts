// Replace the internals of this file with window.electronAPI.dbQuery/dbGet calls. Do not change the exported function signatures.
import type {
  Bill,
  BillItem,
  BillWithItems,
  Expense,
  ManagerData,
  Product,
  Service,
  ServicePrice,
  Session,
  SessionExtension,
  Setting,
} from "@/types";

const STORAGE_KEY = "players-snookers-manager-v1";
const emptyData = (): ManagerData => ({
  settings: [], services: [], service_prices: [], products: [], sessions: [],
  session_extensions: [], bills: [], bill_items: [], expenses: [],
});

function readData(): ManagerData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<ManagerData>;
    const empty = emptyData();
    return Object.fromEntries(Object.keys(empty).map((key) => [key, parsed[key as keyof ManagerData] ?? empty[key as keyof ManagerData]])) as unknown as ManagerData;
  } catch {
    return emptyData();
  }
}

function writeData(data: ManagerData): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function id(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function saveRow<T extends { id: string }>(table: keyof ManagerData, row: T): void {
  const data = readData();
  const rows = data[table] as unknown as T[];
  const index = rows.findIndex((item) => item.id === row.id);
  if (index < 0) rows.unshift(row);
  else rows[index] = row;
  writeData(data);
}

function removeRow(table: keyof ManagerData, rowId: string): void {
  const data = readData();
  (data[table] as unknown as { id: string }[]).splice(0, (data[table] as unknown as { id: string }[]).length, ...(data[table] as unknown as { id: string }[]).filter((row) => row.id !== rowId));
  writeData(data);
}

export async function getServices(): Promise<Service[]> { return readData().services; }
export async function saveService(service: Omit<Service, "id"> & { id?: string }): Promise<Service> { const row = { ...service, id: service.id ?? id() }; saveRow("services", row); return row; }
export async function deleteService(id: string): Promise<void> { const data = readData(); data.services = data.services.filter((row) => row.id !== id); data.service_prices = data.service_prices.filter((row) => row.service_id !== id); writeData(data); }
export async function getTariffs(): Promise<ServicePrice[]> { return readData().service_prices; }
export async function saveTariff(tariff: Omit<ServicePrice, "id"> & { id?: string }): Promise<ServicePrice> { const row = { ...tariff, id: tariff.id ?? id() }; saveRow("service_prices", row); return row; }
export async function deleteTariff(id: string): Promise<void> { removeRow("service_prices", id); }
export async function getProducts(): Promise<Product[]> { return readData().products; }
export async function saveProduct(product: Omit<Product, "id"> & { id?: string }): Promise<Product> { const row = { ...product, id: product.id ?? id() }; saveRow("products", row); return row; }
export async function deleteProduct(id: string): Promise<void> { removeRow("products", id); }
export async function getSessions(): Promise<Session[]> { return readData().sessions; }
export async function createSession(session: Omit<Session, "id"> & { id?: string }): Promise<Session> { const row = { ...session, id: session.id ?? id(), controllers: session.controllers ?? 2 }; saveRow("sessions", row); return row; }
export async function updateSession(session: Session): Promise<Session> { saveRow("sessions", session); return session; }
export async function deleteSession(id: string): Promise<void> { const data = readData(); data.sessions = data.sessions.filter((row) => row.id !== id); data.session_extensions = data.session_extensions.filter((row) => row.session_id !== id); writeData(data); }
export async function addExtension(extension: Omit<SessionExtension, "id"> & { id?: string }): Promise<SessionExtension> { const row = { ...extension, id: extension.id ?? id() }; saveRow("session_extensions", row); return row; }
export async function getBills(): Promise<Bill[]> { const data = readData(); return data.bills.map((bill) => ({ ...bill, items: data.bill_items.filter((item) => item.bill_id === bill.id) })); }
export async function saveBillWithItems(input: BillWithItems): Promise<Bill> { const data = readData(); const index = data.bills.findIndex((bill) => bill.id === input.bill.id); if (index < 0) data.bills.unshift(input.bill); else data.bills[index] = input.bill; data.bill_items = data.bill_items.filter((item) => item.bill_id !== input.bill.id); data.bill_items.unshift(...input.items.map((item) => ({ ...item, bill_id: input.bill.id }))); writeData(data); return { ...input.bill, items: input.items.map((item) => ({ ...item, bill_id: input.bill.id })) }; }
export async function updateBill(bill: Bill): Promise<Bill> { saveRow("bills", bill); return bill; }
export async function deleteBill(id: string): Promise<void> { const data = readData(); data.bills = data.bills.filter((bill) => bill.id !== id); data.bill_items = data.bill_items.filter((item) => item.bill_id !== id); writeData(data); }
export async function getExpenses(): Promise<Expense[]> { return readData().expenses; }
export async function saveExpense(expense: Omit<Expense, "id"> & { id?: string }): Promise<Expense> { const row = { ...expense, id: expense.id ?? id() }; saveRow("expenses", row); return row; }
export async function deleteExpense(id: string): Promise<void> { removeRow("expenses", id); }
export async function getSettings(): Promise<Setting[]> { return readData().settings; }
export async function setSetting(key: string, value: string): Promise<Setting> { const data = readData(); const setting = { key, value }; const index = data.settings.findIndex((row) => row.key === key); if (index < 0) data.settings.push(setting); else data.settings[index] = setting; writeData(data); return setting; }
export async function seedIfEmpty(): Promise<void> {
  const data = readData();
  if (data.services.length > 0 || data.products.length > 0) return;
  const ps5 = { id: id(), name: "PS5", type: "console" };
  const ps4 = { id: id(), name: "PS4", type: "console" };
  const snooker = { id: id(), name: "Snooker", type: "table" };
  data.services = [ps5, ps4, snooker];
  data.service_prices = [
    { id: id(), service_id: ps5.id, duration_minutes: 60, price: 150 }, { id: id(), service_id: ps5.id, duration_minutes: 120, price: 250 },
    { id: id(), service_id: ps4.id, duration_minutes: 60, price: 125 }, { id: id(), service_id: ps4.id, duration_minutes: 120, price: 200 },
    { id: id(), service_id: snooker.id, duration_minutes: 60, price: 250 },
  ];
  data.products = [{ id: id(), name: "Juice", price: 25 }, { id: id(), name: "Fries", price: 80 }, { id: id(), name: "Bhel Puri", price: 50 }];
  data.settings = [
    { key: "overtime_grace_minutes", value: "10" }, { key: "overtime_rate_snooker", value: "4.1666667" },
    { key: "overtime_rate_ps5", value: "2.5" }, { key: "overtime_rate_ps5_4c", value: "4.1666667" },
  ];
  writeData(data);
}

export async function getAllData(): Promise<ManagerData> { return readData(); }
export async function restoreData(data: ManagerData): Promise<void> { writeData(data); }
export async function newId(): Promise<string> { return id(); }

export type { Bill, BillItem, BillWithItems, Expense, Product, Service, ServicePrice, Session, SessionExtension, Setting };