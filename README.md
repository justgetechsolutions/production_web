# QR Ordering System – Multi-Tenant Edition

## Features
- **Multi-tenant:** Each restaurant is isolated by a unique `restaurantSlug`.
- **Per-table QR codes:** Format: `/r/{restaurantSlug}/menu/{tableNumber}`
- **Menu & Order Isolation:** All data and real-time events are tenant-scoped.
- **Admin dashboard:** Each admin can only access their own restaurant’s data.
- **Socket.io:** Real-time order updates, scoped by restaurant.
- **Testing:** Unit and E2E tests for tenant isolation.

---

## Setup

### 1. Install dependencies
```sh
cd server && npm install
cd ../client && npm install
```

### 2. Seed test data
```sh
node ../server/scripts/seedTestData.js
```
- Creates two restaurants: `blue-orchid` and `red-lotus`
- Admin logins: `admin@blueorchid.com` / `password`, `admin@redlotus.com` / `password`
- Each has menu items and a table (table 5)

### 3. Start servers
```sh
cd server && npm start
cd ../client && npm start
```

---

## Usage

- **Scan QR:** `/r/blue-orchid/menu/5` opens Blue Orchid’s menu for table 5
- **Place order:** Order is saved and visible only to Blue Orchid’s admin
- **Admin dashboard:** `/admin/order` shows only your restaurant’s orders
- **Menu management:** `/admin/menu` is tenant-scoped

---

## Real-time Updates
- Orders update in real-time via Socket.io, scoped to each restaurant

---

## Testing

### Backend Unit Test
```sh
cd server && npm test
```
- Verifies menu isolation by `restaurantSlug`

### Cypress E2E Test
```sh
cd client && npm run cypress:open
```
- Simulates QR scan, order placement, and dashboard verification

---

## Architecture Notes
- All backend queries are filtered by `restaurantSlug`
- JWT includes `restaurantSlug` for admin auth
- All admin routes are guarded and tenant-scoped
- QR code generation uses the correct URL format
- Socket.io events are emitted and received in rooms named by `restaurantSlug`

---

## Onboarding a New Restaurant
- Register a new admin with a unique `restaurantSlug`
- Use the admin panel to create tables and generate QRs
- All menu, order, and table management is isolated by tenant

---

## Migration/Seed Script
- See `server/scripts/seedTestData.js` for example data and structure

---

## Contact
For support or customization, contact the development team. 