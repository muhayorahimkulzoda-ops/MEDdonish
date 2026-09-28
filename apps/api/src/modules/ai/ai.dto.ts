import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AskAiDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;
}
