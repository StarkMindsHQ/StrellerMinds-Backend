import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from '../verification.service';
import { EthSignatureStrategy } from '../strategies/eth-signature.strategy';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { IpfsProofStrategy } from '../strategies/ipfs-proof.strategy';

describe('VerificationService', () => {
  let service: VerificationService;
  let ethMock: EthSignatureStrategy;
  let jwtMock: JwtStrategy;
  let ipfsMock: IpfsProofStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerificationService, EthSignatureStrategy, JwtStrategy, IpfsProofStrategy],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    ethMock = module.get<EthSignatureStrategy>(EthSignatureStrategy);
    jwtMock = module.get<JwtStrategy>(JwtStrategy);
    ipfsMock = module.get<IpfsProofStrategy>(IpfsProofStrategy);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call eth_signature strategy', async () => {
    const spy = jest.spyOn(ethMock, 'verify').mockResolvedValue({ verified: true });
    const result = await service.verify({ credentialHash: 'signature', method: 'eth_signature' });
    expect(spy).toHaveBeenCalled();
    expect(result.verified).toBe(true);
  });

  it('should call jwt strategy', async () => {
    const spy = jest.spyOn(jwtMock, 'verify').mockResolvedValue({ verified: true });
    const result = await service.verify({ credentialHash: 'token', method: 'jwt' });
    expect(spy).toHaveBeenCalled();
    expect(result.verified).toBe(true);
  });

  it('should call ipfs strategy', async () => {
    const spy = jest.spyOn(ipfsMock, 'verify').mockResolvedValue({ verified: true });
    const result = await service.verify({ credentialHash: 'cid', method: 'ipfs_proof' });
    expect(spy).toHaveBeenCalled();
    expect(result.verified).toBe(true);
  });

  it('should throw error for unsupported method', async () => {
    await expect(service.verify({ credentialHash: 'x', method: 'unknown' })).rejects.toThrow(
      'Unsupported verification method',
    );
  });
});
