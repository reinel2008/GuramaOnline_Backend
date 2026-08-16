import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovimientosService } from '../../src/movimientos/movimientos.service';
import { ProductosService } from '../../src/productos/productos.service';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('RF-003.2 - RF-003.4 integration flows', () => {
  let movimientosService: MovimientosService;
  let productosService: ProductosService;
  let notificacionesService: NotificacionesService;
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
      producto: {
        fields: { stock_minimo: 'stock_minimo' },
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
      pedido: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosService,
        ProductosService,
        NotificacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    movimientosService = module.get(MovimientosService);
    productosService = module.get(ProductosService);
    notificacionesService = module.get(NotificacionesService);
  });

  describe('RF-003.2 - Salida de producto / actualización de stock', () => {
    it('should create a valid output movement and decrease stock', async () => {
      const dto = {
        Cantidad_m: 5,
        id_m: 'M-S',
        id_producto: 1,
        id_usuario: 'user-1',
        observaciones: 'Salida por venta',
      };

      const producto = {
        id_producto: 1,
        nom_producto: 'Sábana 160',
        stock_actual: 20,
        estado: true,
      };

      const movimiento = {
        id_movimiento: 101,
        Cantidad_m: 5,
        id_m: 'M_S',
        id_producto: 1,
        id_usuario: 'user-1',
        observaciones: 'Salida por venta',
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          producto: {
            findUnique: jest.fn().mockResolvedValue(producto),
            update: jest.fn().mockResolvedValue({ ...producto, stock_actual: 15 }),
          },
          movimiento: {
            create: jest.fn().mockResolvedValue(movimiento),
          },
        };
        return callback(tx);
      });

      const result = await movimientosService.create(dto as any);

      expect(result.stock_actual).toBe(15);
      expect(result.movimiento.id_m).toBe('M_S');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should reject output when stock is insufficient', async () => {
      const dto = {
        Cantidad_m: 25,
        id_m: 'M-S',
        id_producto: 1,
        id_usuario: 'user-1',
        observaciones: 'Salida por venta',
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          producto: {
            findUnique: jest.fn().mockResolvedValue({
              id_producto: 1,
              nom_producto: 'Sábana 160',
              stock_actual: 10,
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

      await expect(movimientosService.create(dto as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-003.3 - Consulta de stock disponible', () => {
    it('should list active products with stock information', async () => {
      const productos = [
        {
          id_producto: 1,
          nom_producto: 'Sábana 160',
          stock_actual: 20,
          stock_minimo: 5,
          categoria: { nombre_c: 'Sabanas' },
          clasificacion: { nombre_clas: 'Top ventas' },
        },
        {
          id_producto: 2,
          nom_producto: 'Cubrelecho',
          stock_actual: 3,
          stock_minimo: 5,
          categoria: { nombre_c: 'Cubrelechos' },
          clasificacion: { nombre_clas: 'Oferta' },
        },
      ];

      prisma.producto.findMany.mockResolvedValue(productos);

      const result = await productosService.findAll({});

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id_producto: 1,
        nom_producto: 'Sábana 160',
        nombre_c: 'Sabanas',
        nombre_clas: 'Top ventas',
      });
      expect(result[1].stock_actual).toBe(3);
    });

    it('should throw when querying a missing product by id', async () => {
      prisma.producto.findFirst.mockResolvedValue(null);

      await expect(productosService.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('RF-003.4 - Alertas de stock bajo', () => {
    it('should generate low-stock alert when stock is below or equal to the minimum', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id_producto: 3,
          nom_producto: 'Toalla',
          stock_actual: 4,
          stock_minimo: 5,
          ultima_actualiz: new Date('2026-08-14T10:00:00Z'),
          categoria: 'Toallas',
          ruta_imagen: '/uploads/productos/3.png',
        },
      ]);

      const result = await notificacionesService.stockBajo({});

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        tipo: 'stock-bajo',
        id_producto: 3,
        nom_producto: 'Toalla',
        stock_actual: 4,
        stock_minimo: 5,
        mensaje: 'Alerta de bajo stock',
      });
    });

    it('should return empty alert list when there are no critical stock products', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await notificacionesService.stockBajo({});

      expect(result).toEqual([]);
    });

    it('should count low-stock and exhausted alerts correctly', async () => {
      prisma.producto.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      prisma.pedido.count.mockResolvedValueOnce(4);

      const result = await notificacionesService.count({});

      expect(result).toEqual({
        alertas_stock_bajo: 2,
        alertas_agotados: 1,
        nuevos_pedidos: 4,
        total_notificaciones: 7,
      });
    });
  });
});
