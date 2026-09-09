import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('users/me')
  @ApiOperation({ summary: 'Retrieve authenticated operative dossier & team affiliation' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update operative display profile' })
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Get('users/:id')
  @Public()
  @ApiOperation({ summary: 'Retrieve public operative dossier' })
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  // Administrative Endpoints
  @Get('admin/users')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Administrative operative directory lookup' })
  async adminListUsers(@Query('search') search?: string) {
    return this.usersService.adminListUsers(search);
  }

  @Patch('admin/users/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Toggle operative account active / suspended status' })
  async adminToggleActive(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @CurrentUser() adminUser: AuthUser,
  ) {
    return this.usersService.adminToggleActive(id, isActive, adminUser);
  }

  @Patch('admin/users/:id/role')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign security role to operative' })
  async adminUpdateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() adminUser: AuthUser,
  ) {
    return this.usersService.adminUpdateRole(id, dto, adminUser);
  }
}
