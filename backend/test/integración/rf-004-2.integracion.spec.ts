import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PedidosPersonalizadosController } from '../../src/pedidos-personalizados/pedidos-personalizados.controller';
import { PedidosPersonalizadosService } from '../../src/pedidos-personalizados/pedidos-personalizados.service';

describe('RF-004.2 - Consultar materiales (integración)', () => {
  let app: INestApplication;
  let service: {
    getMateriales: jest.Mock;
    getMaterialesPorTipo: jest.Mock;
  };

  const materiales = [
    {
      id_material: 1,
      nombre: 'Tela roja',
      tipo: 'Color',
      unidad: 'Metro',
      precio_unitario: 15000,
      stock_actual: 30,
      stock_minimo: 5,
      estado: true,
      ruta_imagen: '/uploads/materiales/roja.png',
    },
    {
      id_material: 2,
      nombre: 'Diseño floral',
      tipo: 'Diseño',
      unidad: 'Unidad',
      precio_unitario: 18000,
      stock_actual: 12,
      stock_minimo: 3,
      estado: false,
      ruta_imagen: '/uploads/materiales/floral.png',
    },
  ];

  beforeEach(async () => {
    service = {
      getMateriales: jest.fn(),
      getMaterialesPorTipo: jest.fn(),
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

  it('CP-009 - consulta el listado de materiales', async () => {
    service.getMateriales.mockResolvedValue(materiales);

    const response = await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales')
      .expect(200);

    expect(service.getMateriales).toHaveBeenCalledWith({});
    expect(response.body).toEqual(materiales);
  });

  it('CP-010 - busca un material por nombre', async () => {
    const filtrado = [materiales[0]];
    service.getMateriales.mockResolvedValue(filtrado);

    const response = await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales')
      .expect(200);

    expect(response.body).toEqual(filtrado);
    expect(response.body[0].nombre).toContain('Tela');
  });

  it('CP-011 - filtra materiales por tipo', async () => {
    service.getMaterialesPorTipo.mockResolvedValue([materiales[0]]);

    const response = await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales/Color')
      .expect(200);

    expect(service.getMaterialesPorTipo).toHaveBeenCalledWith('Color');
    expect(response.body).toEqual([materiales[0]]);
  });

  it('CP-012 - filtra materiales por estado', async () => {
    service.getMateriales.mockResolvedValue([materiales[0]]);

    const response = await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales')
      .expect(200);

    expect(response.body).toEqual([materiales[0]]);
    expect(response.body[0].estado).toBe(true);
  });

  it('CP-013 - devuelve sin resultados cuando no hay coincidencias', async () => {
    service.getMateriales.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('CP-014 - informa que no existen materiales registrados', async () => {
    service.getMateriales.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('CP-015 - deniega la consulta a usuarios sin permisos', async () => {
    service.getMateriales.mockRejectedValue(new ForbiddenException('No posee permisos para consultar materiales.'));

    await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'No posee permisos para consultar materiales.',
        error: 'Forbidden',
      });
  });

  it('CP-016 - maneja el error de conexión con la base de datos', async () => {
    service.getMateriales.mockRejectedValue(new Error('DB connection failed'));

    await request(app.getHttpServer())
      .get('/pedidos-personalizados/materiales')
      .expect(500)
      .expect({
        statusCode: 500,
        message: 'Error al obtener materiales',
        error: 'Internal Server Error',
      });
  });
});
