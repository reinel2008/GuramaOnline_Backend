import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PedidosPersonalizadosService } from '../src/pedidos-personalizados/pedidos-personalizados.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('RF-004 material integration flows', () => {
  let service: PedidosPersonalizadosService;
  let prisma: {
    material: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    material_color: { findMany: jest.Mock };
    material_diseno: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      material: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      material_color: { findMany: jest.fn() },
      material_diseno: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosPersonalizadosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PedidosPersonalizadosService);
  });

  describe('RF-004.1 - Registrar material', () => {
    it('should register a valid material', async () => {
      const dto = {
        nombre: 'Color Azul',
        tipo: 'Color',
        unidad: 'Unidad',
        precio_unitario: 12,
        stock_actual: 30,
        stock_minimo: 5,
      };

      const created = { id_material: 1, ...dto, estado: true };
      prisma.material.create.mockResolvedValue(created);

      const result = await service.crearMaterial(dto);

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          nombre: dto.nombre,
          tipo: dto.tipo,
          unidad: dto.unidad,
          precio_unitario: dto.precio_unitario,
          stock_actual: dto.stock_actual,
          stock_minimo: dto.stock_minimo,
          estado: true,
        },
      });
      expect(result).toEqual(created);
    });

    it('should reject duplicate material name', async () => {
      const dto = {
        nombre: 'Color Azul',
        tipo: 'Color',
        unidad: 'Unidad',
        precio_unitario: 12,
        stock_actual: 30,
        stock_minimo: 5,
      };

      prisma.material.create.mockRejectedValue({ code: '23505' });

      await expect(service.crearMaterial(dto)).rejects.toMatchObject({ code: '23505' });
    });

    it('should reject invalid numeric values', async () => {
      const dto = {
        nombre: 'Color Rojo',
        tipo: 'Color',
        unidad: 'Unidad',
        precio_unitario: -2,
        stock_actual: 0,
        stock_minimo: 0,
      };

      prisma.material.create.mockRejectedValue(new BadRequestException('Invalid data'));

      await expect(service.crearMaterial(dto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('RF-004.2 - Consultar materiales', () => {
    it('should list active materials', async () => {
      const expected = [
        { id_material: 1, nombre: 'Azul', tipo: 'Color', unidad: 'Unidad', precio_unitario: 10, stock_actual: 25, ruta_imagen: '/img/1.png' },
      ];
      prisma.material.findMany.mockResolvedValue(expected);

      const result = await service.getMateriales({});

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: { estado: true },
        select: {
          id_material: true,
          nombre: true,
          tipo: true,
          unidad: true,
          precio_unitario: true,
          stock_actual: true,
          ruta_imagen: true,
        },
      });
      expect(result).toEqual(expected);
    });

    it('should return colors for a material', async () => {
      const expected = [{ id_color: 1, nombre: 'Azul', codigo_hex: '#0000FF' }];
      prisma.material_color.findMany.mockResolvedValue(expected);

      const result = await service.getColoresMaterial(1);

      expect(prisma.material_color.findMany).toHaveBeenCalledWith({
        where: { id_material: 1, estado: true },
        select: { id_color: true, nombre: true, codigo_hex: true },
      });
      expect(result).toEqual(expected);
    });

    it('should return designs for a material', async () => {
      const expected = [{ id_diseno: 1, nombre: 'Floral', ruta_imagen: '/img/floral.png' }];
      prisma.material_diseno.findMany.mockResolvedValue(expected);

      const result = await service.getDisenosMaterial(2);

      expect(prisma.material_diseno.findMany).toHaveBeenCalledWith({
        where: { id_material: 2, estado: true },
        select: { id_diseno: true, nombre: true, ruta_imagen: true },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('RF-004.3 - Editar material', () => {
    it('should update material if exists', async () => {
      const id = 8;
      const existing = { id_material: id, nombre: 'Viejo', tipo: 'Color', unidad: 'Unidad', precio_unitario: 7, stock_actual: 12, stock_minimo: 2 };
      const dto = { nombre: 'Nuevo', tipo: 'Diseño', unidad: 'Metro', precio_unitario: 9, stock_actual: 18, stock_minimo: 3 };
      const updated = { id_material: id, ...dto };

      prisma.material.findUnique.mockResolvedValue(existing);
      prisma.material.update.mockResolvedValue(updated);

      const result = await service.actualizarMaterial(id, dto);

      expect(prisma.material.findUnique).toHaveBeenCalledWith({ where: { id_material: id } });
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id_material: id },
        data: {
          ...dto,
          tipo: dto.tipo,
          unidad: dto.unidad,
        },
      });
      expect(result).toEqual(updated);
    });

    it('should reject update when material does not exist', async () => {
      prisma.material.findUnique.mockResolvedValue(null);

      await expect(service.actualizarMaterial(999, { nombre: 'No existe' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('RF-004.4 - Desactivar material', () => {
    it('should deactivate an active material', async () => {
      const id = 4;
      prisma.material.findUnique.mockResolvedValue({ id_material: id, estado: true });
      prisma.material.update.mockResolvedValue({ id_material: id, estado: false });

      const result = await service.desactivarMaterial(id);

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id_material: id },
        data: { estado: false },
      });
      expect(result).toEqual({ success: true, message: 'Material desactivado exitosamente' });
    });

    it('should reject deactivation when material is already inactive', async () => {
      prisma.material.findUnique.mockResolvedValue({ id_material: 4, estado: false });

      await expect(service.desactivarMaterial(4)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
