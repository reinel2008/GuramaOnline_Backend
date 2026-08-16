import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovimientosService } from '../../src/movimientos/movimientos.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('RF-003.1 integration flows', () => {
  let service: MovimientosService;
  let prisma: any;

  beforeEach(async () => {
    const tx = {
      producto: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      movimiento: {
        create: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MovimientosService);
  });

  it('should create a valid stock input movement and increase product stock', async () => {
    const dto = {
      Cantidad_m: 10,
      id_m: 'M-E',
      id_producto: 1,
      id_usuario: 'user-1',
      observaciones: 'Ingreso por compra',
    };

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        producto: {
          findUnique: jest.fn().mockResolvedValue({
            id_producto: 1,
            nom_producto: 'Sábana 160',
            stock_actual: 5,
            estado: true,
          }),
          update: jest.fn().mockResolvedValue({
            id_producto: 1,
            stock_actual: 15,
            ultima_actualiz: new Date(),
          }),
        },
        movimiento: {
          create: jest.fn().mockResolvedValue({
            id_movimiento: 1,
            Cantidad_m: 10,
            id_m: 'M_E',
            id_producto: 1,
            id_usuario: 'user-1',
            observaciones: 'Ingreso por compra',
          }),
        },
      };
      return callback(tx);
    });

    const result = await service.create(dto as any);

    expect(result.stock_actual).toBe(15);
    expect(result.movimiento.id_m).toBe('M_E');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('should reject input when the product does not exist', async () => {
    const dto = {
      Cantidad_m: 10,
      id_m: 'M-E',
      id_producto: 999,
      id_usuario: 'user-1',
      observaciones: 'Ingreso por compra',
    };

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        producto: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        movimiento: {
          create: jest.fn(),
        },
      };
      return callback(tx);
    });

    await expect(service.create(dto as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject invalid quantity when value is zero or negative', async () => {
    const dto = {
      Cantidad_m: 0,
      id_m: 'M-E',
      id_producto: 1,
      id_usuario: 'user-1',
      observaciones: 'Ingreso inválido',
    };

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        producto: {
          findUnique: jest.fn().mockResolvedValue({
            id_producto: 1,
            nom_producto: 'Sábana 160',
            stock_actual: 5,
            estado: true,
          }),
          update: jest.fn(),
        },
        movimiento: {
          create: jest.fn(),
        },
      };
      return callback(tx);
    });

    await expect(service.create(dto as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
