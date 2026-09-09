import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './dto/login.dto';

describe('LoginDto Validation Tests', () => {
  it('should pass validation with valid email and password', async () => {
    const payload = {
      email: 'agent@cybercrew.online',
      password: 'StrongSecretPassword123!',
    };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.email).toBe('agent@cybercrew.online');
  });

  it('should trim and lowercase email', async () => {
    const payload = {
      email: '  AGENT@CyberCrew.Online  ',
      password: 'StrongSecretPassword123!',
    };
    const dto = plainToInstance(LoginDto, payload);
    expect(dto.email).toBe('agent@cybercrew.online');
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when email is missing', async () => {
    const payload = {
      password: 'StrongSecretPassword123!',
    };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
    expect(emailError?.constraints?.isNotEmpty).toBe('Email address is required.');
  });

  it('should fail validation when email is empty string', async () => {
    const payload = {
      email: '',
      password: 'StrongSecretPassword123!',
    };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail validation when email format is invalid', async () => {
    const payload = {
      email: 'not-an-email-address',
      password: 'StrongSecretPassword123!',
    };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
    expect(emailError?.constraints?.isEmail).toBe('Invalid email address format.');
  });

  it('should fail validation when password is missing', async () => {
    const payload = {
      email: 'agent@cybercrew.online',
    };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const passError = errors.find((e) => e.property === 'password');
    expect(passError).toBeDefined();
    expect(passError?.constraints?.isNotEmpty).toBe('Password is required.');
  });

  it('should fail validation when password is empty string', async () => {
    const payload = {
      email: 'agent@cybercrew.online',
      password: '',
    };
    const dto = plainToInstance(LoginDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const passError = errors.find((e) => e.property === 'password');
    expect(passError).toBeDefined();
  });
});
