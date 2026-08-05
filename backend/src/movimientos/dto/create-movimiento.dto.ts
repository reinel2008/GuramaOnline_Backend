import { Type } from 'class-transformer';
import { IsString, IsInt, Min, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateMovimientoDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  Cantidad_m: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  observaciones?: string;

  @IsString()
  @IsIn(['M-E', 'M-S', 'M_E', 'M_S'])
  id_m: string;

  @IsInt()
  @Type(() => Number)
  id_producto: number;

  @IsString()
  id_usuario: string;
}