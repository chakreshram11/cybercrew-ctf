import { PartialType } from '@nestjs/swagger';
import { CreateHintDto } from './create-hint.dto';

export class UpdateHintDto extends PartialType(CreateHintDto) {}
