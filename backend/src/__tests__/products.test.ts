import request from 'supertest';
import app from '../app';

let token: string;
let categoryId: string;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@vendoraft.com', password: 'admin123' });

  token = loginRes.body.token;

  const categoryRes = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Test Category ${Date.now()}` });

  categoryId = categoryRes.body.id;
});

describe('POST /api/products', () => {
  it('returns 201 with created product for valid data', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Product',
        sku: `SKU-${Date.now()}`,
        categoryId,
        price: 19.99,
        costPrice: 8.00,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.category.name).toBeDefined();
  });
});

describe('GET /api/products', () => {
  it('returns 200 with an array for authenticated request', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(401);
  });
});
