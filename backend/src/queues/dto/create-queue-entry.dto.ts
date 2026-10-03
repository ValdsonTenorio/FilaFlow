import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateQueueEntryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/ {2,}/g, ' ') : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[\p{L}][\p{L}' -]*$/u, {
    message: 'Informe somente o primeiro nome.',
  })
  firstName!: string;
}
