import request from 'supertest';
import { app } from '../index';

describe('Market Endpoints', () => {
  it('should create a new market', async () => {
    const response = await request(app)
      .post('/market')
      .send({ slug: 'test-market', imageUrl: 'http://example.com/image.png', secret: process.env.ADMIN_SECRET });

    expect(response.status).toBe(201);
    expect(response.body.market).toHaveProperty('slug', 'test-market');
  });

  it('should get all markets', async () => {
    const response = await request(app).get('/markets');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
