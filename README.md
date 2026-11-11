# Players & Snookers Manager

Frontend-only lounge manager for sessions, billing, services, refreshments, expenses, and daily reports. The browser preview persists data locally through `src/lib/db.ts`; a future desktop integration can replace that file's internals with the host database calls without changing its exported API. There is no Electron process or native database in this project.

All IDs are strings, rupee amounts are integer rupees, and stored times are epoch milliseconds. All functions return promises.

## Data interface (`src/lib/db.ts`)

| Function | Parameters | Return type | Purpose |
| --- | --- | --- | --- |
| `getServices` | none | `Promise<Service[]>` | List service stations. |
| `saveService` | `service: Omit<Service, "id"> & { id?: string }` | `Promise<Service>` | Create a station or save an edited station. |
| `deleteService` | `id: string` | `Promise<void>` | Delete a station and its tariffs. |
| `getTariffs` | none | `Promise<ServicePrice[]>` | List hourly/package rates. |
| `saveTariff` | `tariff: Omit<ServicePrice, "id"> & { id?: string }` | `Promise<ServicePrice>` | Create or edit a rate. |
| `deleteTariff` | `id: string` | `Promise<void>` | Delete a rate. |
| `getProducts` | none | `Promise<Product[]>` | List refreshments. |
| `saveProduct` | `product: Omit<Product, "id"> & { id?: string }` | `Promise<Product>` | Create or edit a product. |
| `deleteProduct` | `id: string` | `Promise<void>` | Delete a product. |
| `getSessions` | none | `Promise<Session[]>` | List gaming sessions. |
| `createSession` | `session: Omit<Session, "id"> & { id?: string }` | `Promise<Session>` | Create a session, defaulting controllers to 2. |
| `updateSession` | `session: Session` | `Promise<Session>` | Replace a session record. |
| `deleteSession` | `id: string` | `Promise<void>` | Delete a session and its extensions. |
| `addExtension` | `extension: Omit<SessionExtension, "id"> & { id?: string }` | `Promise<SessionExtension>` | Record time and cost added to a session. |
| `getBills` | none | `Promise<Bill[]>` | List bills with their line items attached. |
| `saveBillWithItems` | `input: { bill: Bill; items: Omit<BillItem, "bill_id">[] }` | `Promise<Bill>` | Save/replace a bill and all its items atomically. |
| `updateBill` | `bill: Bill` | `Promise<Bill>` | Edit an existing bill. |
| `deleteBill` | `id: string` | `Promise<void>` | Delete a bill and its line items. |
| `getExpenses` | none | `Promise<Expense[]>` | List expense records. |
| `saveExpense` | `expense: Omit<Expense, "id"> & { id?: string }` | `Promise<Expense>` | Create or edit an expense. |
| `deleteExpense` | `id: string` | `Promise<void>` | Delete an expense. |
| `getSettings` | none | `Promise<Setting[]>` | Read all key/value settings. |
| `setSetting` | `key: string, value: string` | `Promise<Setting>` | Create or replace a setting value. |
| `seedIfEmpty` | none | `Promise<void>` | Add starter services, rates, products, and overtime settings to an empty store. |

The adapter also exports `getAllData`, `restoreData`, and `newId` for browser backup/import and UI support. Keep every browser storage read/write inside this module.

## Local development

Run `bun dev` to start the preview. `bun test` runs the focused billing rules and route checks.