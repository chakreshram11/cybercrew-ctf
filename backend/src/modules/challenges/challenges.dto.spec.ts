import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateChallengeDto } from './dto/create-challenge.dto';

describe('CreateChallengeDto Regression Validation Tests', () => {
  const validPayload = {
    name: 'Caesars Secret',
    slug: 'caesars-secret',
    category_id: '11111111-1111-1111-1111-111111111102',
    description: 'Decode the following ciphertext using a Caesar cipher with a shift of 3.\n\nFFFWIJXKHW RWL\n\nWhat is the hidden flag?',
    difficulty: 'EASY',
    challenge_type: 'CRYPTO',
    base_points: 500,
    minimum_points: 100,
    first_blood_bonus: 50,
    flag: 'CCCTF{caesar_cipher}',
    status: 'ACTIVE',
  };

  it('should pass validation with a valid synthetic PostgreSQL category UUID', async () => {
    const dto = plainToInstance(CreateChallengeDto, validPayload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with a standard v4 UUID for category_id', async () => {
    const dto = plainToInstance(CreateChallengeDto, {
      ...validPayload,
      category_id: '713b11e2-e134-4f58-b525-f7c47da974c8',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when category_id is not a valid UUID format', async () => {
    const dto = plainToInstance(CreateChallengeDto, {
      ...validPayload,
      category_id: 'not-a-valid-uuid-format',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const categoryError = errors.find((e) => e.property === 'category_id');
    expect(categoryError).toBeDefined();
    expect(categoryError?.constraints?.matches).toBe('category_id must be a valid UUID format');
  });

  it('should fail validation when difficulty is invalid', async () => {
    const dto = plainToInstance(CreateChallengeDto, {
      ...validPayload,
      difficulty: 'SUPER_EASY' as any,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const difficultyError = errors.find((e) => e.property === 'difficulty');
    expect(difficultyError).toBeDefined();
  });

  it('should fail validation when challenge_type is invalid', async () => {
    const dto = plainToInstance(CreateChallengeDto, {
      ...validPayload,
      challenge_type: 'INVALID_TYPE' as any,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const typeError = errors.find((e) => e.property === 'challenge_type');
    expect(typeError).toBeDefined();
  });

  it('should fail validation when base_points is below minimum allowed value', async () => {
    const dto = plainToInstance(CreateChallengeDto, {
      ...validPayload,
      base_points: 5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const pointsError = errors.find((e) => e.property === 'base_points');
    expect(pointsError).toBeDefined();
  });

  it('should fail validation when name is too short', async () => {
    const dto = plainToInstance(CreateChallengeDto, {
      ...validPayload,
      name: 'ab',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const nameError = errors.find((e) => e.property === 'name');
    expect(nameError).toBeDefined();
  });

  it('should fail validation when description is missing', async () => {
    const payloadWithoutDesc = { ...validPayload };
    delete (payloadWithoutDesc as any).description;
    const dto = plainToInstance(CreateChallengeDto, payloadWithoutDesc);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const descError = errors.find((e) => e.property === 'description');
    expect(descError).toBeDefined();
  });
});
