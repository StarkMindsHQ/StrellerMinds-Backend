// test/analytics.e2e-spec.ts
it('should return 400 for invalid format', async () => {
  const res = await request(app.getHttpServer()).get('/analytics/export?format=xml');
  expect(res.status).toBe(400);
  expect(res.body.message[0].constraints).toHaveProperty('isIn');
});
//sh
