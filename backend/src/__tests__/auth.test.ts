import request from 'supertest';
import app from '../app';

describe('POST /api/auth/login', () => {
  it('returns 200 and a token with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@vendoraft.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('admin@vendoraft.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@vendoraft.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('returns 400 with empty body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});
