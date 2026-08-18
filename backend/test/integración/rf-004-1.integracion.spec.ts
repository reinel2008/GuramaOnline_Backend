import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { PedidosPersonalizadosController } from '../../src/pedidos-personalizados/pedidos-personalizados.controller';
import { PedidosPersonalizadosService } from '../../src/pedidos-personalizados/pedidos-personalizados.service';

describe('RF-004.1 - Registrar material (integración)', () => {
  let app: INestApplication;
  let service: { crearMaterial: jest.Mock };

  const payload = {
    nombre: 'Tela roja',
    tipo: 'Color',
    unidad: 'Metro',
    precio_unitario: 15000,
    stock_actual: 30,
    stock_minimo: 5,
  };

  beforeEach(async () => {
    service = {
      crearMaterial: jest.fn(),
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

  it('CP-001 - registra material exitosamente', async () => {
    const materialCreado = { id_material: 10, ...payload, estado: true };
    service.crearMaterial.mockResolvedValue(materialCreado);

    const response = await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send(payload)
      .expect(201);

    expect(service.crearMaterial).toHaveBeenCalledWith(payload);
    expect(response.body).toEqual(materialCreado);
  });

  it('CP-002 - impide registrarlo si el material ya existe', async () => {
    service.crearMaterial.mockRejectedValue({ code: '23505' });

    await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send(payload)
      .expect(409)
      .expect({
        statusCode: 409,
        message: 'Ya existe un material con ese nombre',
        error: 'Conflict',
      });
  });

  it('CP-003 - invalida precio unitario negativo', async () => {
    service.crearMaterial.mockRejectedValue(new BadRequestException('El costo adicional no es válido.'));

    await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send({ ...payload, precio_unitario: -1 })
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'El costo adicional no es válido.',
        error: 'Bad Request',
      });
  });

  it('CP-004 - muestra validaciones cuando faltan campos obligatorios', async () => {
    service.crearMaterial.mockImplementation((dto: any) => {
      if (!dto.unidad || !dto.precio_unitario || !dto.stock_actual || !dto.stock_minimo) {
        throw new BadRequestException('Existen campos obligatorios sin diligenciar.');
      }
      return { id_material: 99, ...dto, estado: true };
    });

    await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send({
        nombre: 'Tela nueva',
        tipo: 'Color',
      })
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'Existen campos obligatorios sin diligenciar.',
        error: 'Bad Request',
      });

    expect(service.crearMaterial).toHaveBeenCalled();
  });

  it('CP-005 - rechaza imagen con formato no permitido', async () => {
    service.crearMaterial.mockRejectedValue(new BadRequestException('La imagen seleccionada no cumple con el formato permitido.'));

    await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send(payload)
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'La imagen seleccionada no cumple con el formato permitido.',
        error: 'Bad Request',
      });
  });

  it('CP-006 - deniega acceso a usuarios sin permisos', async () => {
    service.crearMaterial.mockRejectedValue(new BadRequestException('No posee permisos para realizar esta operación.'));

    await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send(payload)
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'No posee permisos para realizar esta operación.',
        error: 'Bad Request',
      });
  });

  it('CP-007 - maneja error de conexión con la base de datos', async () => {
    service.crearMaterial.mockRejectedValue(new Error('DB connection failed'));

    await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send(payload)
      .expect(500)
      .expect({
        statusCode: 500,
        message: 'Error al crear material',
        error: 'Internal Server Error',
      });
  });

  it('CP-008 - valida auditoría en el registro exitoso', async () => {
    const materialCreado = { id_material: 11, ...payload, estado: true };
    service.crearMaterial.mockResolvedValue(materialCreado);

    const response = await request(app.getHttpServer())
      .post('/pedidos-personalizados/materiales')
      .send(payload)
      .expect(201);

    expect(response.body).toHaveProperty('id_material');
    expect(response.body.estado).toBe(true);
  });
});
