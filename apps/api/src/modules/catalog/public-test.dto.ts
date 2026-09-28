import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, IsUUID, ValidateNested } from 'class-validator';

export class PublicTestAnswerItemDto {
  @IsUUID()
  questionId: string;

  @IsString()
  selectedCode: string;
}

export class GradePublicTestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PublicTestAnswerItemDto)
  answers: PublicTestAnswerItemDto[];
}
