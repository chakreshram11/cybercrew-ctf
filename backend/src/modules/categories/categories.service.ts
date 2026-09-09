import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private supabaseService: SupabaseService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Retrieves active categories for challenge catalog navigation.
   */
  async listActiveCategories() {
    const client = this.supabaseService.getClient();

    const { data: categories, error } = await client
      .from('categories')
      .select('id, name, slug, description, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve categories.');
    }

    return categories || [];
  }

  /**
   * Administrative category listing including challenge counts.
   */
  async adminListCategories() {
    const client = this.supabaseService.getClient();

    const { data: categories, error } = await client
      .from('categories')
      .select(`
        id,
        name,
        slug,
        description,
        display_order,
        is_active,
        challenges:challenges(count)
      `)
      .order('display_order', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to query administrative categories.');
    }

    return (categories || []).map((c: any) => ({
      ...c,
      challenges_count: c.challenges?.[0]?.count || 0,
    }));
  }

  /**
   * Creates a new challenge discipline / category.
   */
  async createCategory(dto: CreateCategoryDto) {
    const client = this.supabaseService.getClient();
    const slug = this.generateSlug(dto.name);

    const { data: conflict } = await client
      .from('categories')
      .select('id')
      .or(`name.ilike.${dto.name},slug.eq.${slug}`)
      .maybeSingle();

    if (conflict) {
      throw new ConflictException('Category with this name or slug already exists.');
    }

    const { data: newCat, error } = await client
      .from('categories')
      .insert({
        name: dto.name.trim(),
        slug,
        description: dto.description,
        display_order: dto.display_order ?? 0,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error || !newCat) {
      throw new InternalServerErrorException('Failed to create category.');
    }

    return newCat;
  }

  /**
   * Updates an existing category.
   */
  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const client = this.supabaseService.getClient();

    const updatePayload: any = {
      ...dto,
      updated_at: new Date().toISOString(),
    };

    if (dto.name) {
      updatePayload.slug = this.generateSlug(dto.name);
    }

    const { data: updated, error } = await client
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new NotFoundException('Category not found or update failed.');
    }

    return updated;
  }

  /**
   * Deletes a category if no challenges are bound to it.
   */
  async deleteCategory(id: string) {
    const client = this.supabaseService.getClient();

    // Check challenge constraints
    const { count } = await client
      .from('challenges')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count !== null && count > 0) {
      throw new ConflictException(
        `Cannot delete category: ${count} challenges are currently assigned to this category. Reassign or delete challenges first.`,
      );
    }

    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) {
      throw new InternalServerErrorException('Failed to delete category.');
    }

    return { success: true, message: 'Category removed.' };
  }
}
