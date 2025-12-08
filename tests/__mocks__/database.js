const mockPool = {
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn()
  }),
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  end: jest.fn()
};

module.exports = { pool: mockPool };
