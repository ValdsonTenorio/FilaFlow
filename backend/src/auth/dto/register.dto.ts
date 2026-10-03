import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'A senha deve conter letra minúscula.' })
  @Matches(/[A-Z]/, { message: 'A senha deve conter letra maiúscula.' })
  @Matches(/\d/, { message: 'A senha deve conter número.' })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  organizationName!: string;
}
