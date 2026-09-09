import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from './supabase.service';
import { ConfigService } from '@nestjs/config';

describe('SupabaseService - Cryptographic Operations', () => {
  let service: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'security.flagSecretSalt') {
                return 'test-salt-secret-minimum-32-characters-long';
              }
              if (key === 'supabase.url') {
                return 'https://test.supabase.co';
              }
              if (key === 'supabase.serviceRoleKey') {
                return 'test-service-role-key';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
  });

  describe('HMAC Blind Flag Hashing', () => {
    it('should generate a 64-character hex SHA-256 HMAC hash', () => {
      const hash = service.hashFlag('CCCTF{test_flag_value}');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('should produce identical hashes for identical inputs', () => {
      const hash1 = service.hashFlag('CCCTF{consistent_hash}');
      const hash2 = service.hashFlag('CCCTF{consistent_hash}');
      expect(hash1).toBe(hash2);
    });

    it('should produce distinct hashes for different inputs (collision resistance)', () => {
      const hash1 = service.hashFlag('CCCTF{flag_one}');
      const hash2 = service.hashFlag('CCCTF{flag_two}');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Timing-Safe Flag Verification', () => {
    it('should successfully verify correct flag', () => {
      const plainFlag = 'CCCTF{correct_solution}';
      const storedHash = service.hashFlag(plainFlag);

      const isValid = service.verifyFlag(plainFlag, storedHash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect flags without timing leakage', () => {
      const plainFlag = 'CCCTF{correct_solution}';
      const wrongFlag = 'CCCTF{wrong_guess}';
      const storedHash = service.hashFlag(plainFlag);

      const isValid = service.verifyFlag(wrongFlag, storedHash);
      expect(isValid).toBe(false);
    });
  });

  describe('Cryptographic Invite Code Generation', () => {
    it('should generate an 8-character uppercase hex invite code', () => {
      const code1 = service.generateInviteCode();
      const code2 = service.generateInviteCode();

      expect(code1).toHaveLength(8);
      expect(code2).toHaveLength(8);
      expect(/^[0-9A-F]{8}$/.test(code1)).toBe(true);
      expect(code1).not.toBe(code2); // High entropy
    });
  });

  describe('Privacy-Preserving IP Hashing', () => {
    it('should produce a deterministic SHA-256 hash for IP addresses', () => {
      const hash1 = service.hashIp('192.168.1.100');
      const hash2 = service.hashIp('192.168.1.100');
      const hash3 = service.hashIp('10.0.0.1');

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });
});
