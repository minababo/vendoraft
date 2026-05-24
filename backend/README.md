# Vendoraft Backend

REST API for Vendoraft — inventory and POS system for small businesses.

Built with Node.js, Express, Prisma, TypeScript, and PostgreSQL (Neon).

## Live URL

```
https://vendoraft.onrender.com
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health | No | Health check |
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/categories | Yes | List categories |
| POST | /api/categories | Yes | Create category |
| PUT | /api/categories/:id | Yes | Update category |
| DELETE | /api/categories/:id | Yes | Delete category |
| GET | /api/products | Yes | List products (search, filter, sort) |
| POST | /api/products | Yes | Create product |
| GET | /api/products/:id | Yes | Get product |
| PUT | /api/products/:id | Yes | Update product |
| DELETE | /api/products/:id | Yes | Delete product |
| POST | /api/stock/in | Yes | Record stock in |
| POST | /api/stock/out | Yes | Record stock out |
| GET | /api/stock/movements | Yes | List stock movements |
| POST | /api/sales | Yes | Record a sale |
| GET | /api/sales | Yes | List sales |
| GET | /api/reports/daily | Yes | Daily sales report |
| GET | /api/reports/valuation | Yes | Inventory valuation |
| GET | /api/dashboard | Yes | Dashboard summary |

## Local Development

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, PORT

npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Running Tests

```bash
npm test
```
