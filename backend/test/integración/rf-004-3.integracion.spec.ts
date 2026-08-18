import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { PedidosPersonalizadosController } from '../../src/pedidos-personalizados/pedidos-personalizados.controller';
import { PedidosPersonalizadosService } from '../../src/pedidos-personalizados/pedidos-personalizados.service';

describe('RF-004.3 - Editar material (integración)', () => {
  let app: INestApplication;
  let service: {
    actualizarMaterial: jest.Mock;
  };

  const payload = {
    nombre: 'Tela azul',
    tipo: 'Color',
    unidad: 'Metro',
    precio_unitario: 16000,
    stock_actual: 25,
    stock_minimo: 4,
  };

  beforeEach(async () => {
    service = {
      actualizarMaterial: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PedidosPersonalizadosController],
      providers: [{ provide: PedidosPersonalizadosService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('CP-017 - actualiza un material exitosamente', async () => {
    const actualizado = { id_material: 5, ...payload, estado: true };
    service.actualizarMaterial.mockResolvedValue(actualizado);

    const response = await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5')
      .send(payload)
      .expect(200);

    expect(service.actualizarMaterial).toHaveBeenCalledWith(5, payload);
    expect(response.body).toEqual(actualizado);
  });

  it('CP-018 - informa error si el material no existe', async () => {
    service.actualizarMaterial.mockRejectedValue(new NotFoundException('Material 99 no encontrado'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/99')
      .send(payload)
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Material 99 no encontrado',
        error: 'Not Found',
      });
  });

  it('CP-019 - impide duplicar el nombre de otro material', async () => {
    service.actualizarMaterial.mockRejectedValue({ code: '23505' });

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5')
      .send(payload)
      .expect(409)
      .expect({
        statusCode: 409,
        message: 'Ya existe un material con ese nombre',
        error: 'Conflict',
      });
  });

  it('CP-020 - impide costo adicional negativo', async () => {
    service.actualizarMaterial.mockRejectedValue(new BadRequestException('El costo adicional no es válido.'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5')
      .send({ ...payload, precio_unitario: -1 })
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'El costo adicional no es válido.',
        error: 'Bad Request',
      });
  });

  it('CP-021 - muestra validación cuando faltan campos obligatorios', async () => {
    service.actualizarMaterial.mockImplementation((id: number, dto: any) => {
      if (!dto.nombre || !dto.tipo || !dto.unidad || dto.precio_unitario === undefined || dto.stock_actual === undefined || dto.stock_minimo === undefined) {
        throw new BadRequestException('Existen campos obligatorios sin diligenciar.');
      }
      return { id_material: id, ...dto, estado: true };
    });

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5')
      .send({ nombre: 'Material incompleto', tipo: 'Color' })
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'Existen campos obligatorios sin diligenciar.',
        error: 'Bad Request',
      });
  });

  it('CP-022 - rechaza imagen inválida', async () => {
    service.actualizarMaterial.mockRejectedValue(new BadRequestException('La imagen seleccionada no cumple con el formato permitido.'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5')
      .send(payload)
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'La imagen seleccionada no cumple con el formato permitido.',
        error: 'Bad Request',
      });
  });

  it('CP-023 - deniega acceso a usuarios sin permisos', async () => {
    service.actualizarMaterial.mockRejectedValue(new ForbiddenException('No posee permisos para realizar esta operación.'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5')
      .send(payload)
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'No posee permisos para realizar esta operación.',
        error: 'Forbidden',
      });
  });

  it('CP-024 - maneja error de conexión con la base de datos', async () => {
    service.actualizarMaterial.mockRejectedValue(new Error('DB connection failed'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5')
      .send(payload)
      .expect(500)
      .expect({
        statusCode: 500,
        message: 'Error al actualizar material',
        error: 'Internal Server Error',
      });
  });

  it('CP-025 - valida registro en auditoría', async () => {
    const actualizado = { id_material: 6, ...payload, estado: true };
    service.actualizarMaterial.mockResolvedValue(actualizado);

    const response = await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/6')
      .send(payload)
      .expect(200);

    expect(response.body).toHaveProperty('id_material');
    expect(response.body.estado).toBe(true);
  });
});
