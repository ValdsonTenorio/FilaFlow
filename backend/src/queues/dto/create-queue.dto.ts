import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateQueueDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, { message: 'O link público deve conter apenas letras minúsculas, números e hífens.' })
  publicSlug!: string;
}
