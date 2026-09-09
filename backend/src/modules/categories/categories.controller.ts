import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller()
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List all active challenge categories' })
  async listActiveCategories() {
    return this.categoriesService.listActiveCategories();
  }

  // Administrative Endpoints
  @Get('admin/categories')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Administrative category listing with challenge counts' })
  async adminListCategories() {
    return this.categoriesService.adminListCategories();
  }

  @Post('admin/categories')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new challenge category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @Patch('admin/categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an existing challenge category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a challenge category (requires 0 assigned challenges)' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
