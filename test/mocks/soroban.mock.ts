// test/mocks/soroban.mock.ts
export const mockSorobanClient = {
  invokeContract: jest.fn(async (contractId: string, method: string, args: any[]) => {
    if (method === 'fail') {
      throw new Error('Mocked contract failure');
    }
    return {
      contractId,
      method,
      args,
      result: 'mock-success',
    };
  }),
};
