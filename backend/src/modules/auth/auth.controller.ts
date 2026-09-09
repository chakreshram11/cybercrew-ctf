import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthSyncDto } from './dto/auth-sync.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate operative credentials and return session tokens' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or suspended account.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new operative with pre-confirmed email' })
  @ApiResponse({ status: 201, description: 'Operative registered and activated.' })
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Synchronize operative profile with Supabase Auth session' })
  @ApiResponse({ status: 200, description: 'Operative profile synchronized.' })
  async syncProfile(@CurrentUser() user: AuthUser, @Body() dto: AuthSyncDto) {
    return this.authService.syncUser(user.id, dto);
  }
}
