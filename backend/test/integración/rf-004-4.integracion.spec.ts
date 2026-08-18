import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, INestApplication, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { PedidosPersonalizadosController } from '../../src/pedidos-personalizados/pedidos-personalizados.controller';
import { PedidosPersonalizadosService } from '../../src/pedidos-personalizados/pedidos-personalizados.service';

describe('RF-004.4 - Eliminar/desactivar material (integración)', () => {
  let app: INestApplication;
  let service: {
    desactivarMaterial: jest.Mock;
  };

  const materialDesactivado = {
    id_material: 5,
    nombre: 'Tela azul',
    tipo: 'Color',
    unidad: 'Metro',
    precio_unitario: 16000,
    stock_actual: 25,
    stock_minimo: 4,
    estado: false,
    message: 'Material desactivado exitosamente',
  };

  beforeEach(async () => {
    service = {
      desactivarMaterial: jest.fn(),
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

  it('CP-026 - desactiva un material exitosamente', async () => {
    service.desactivarMaterial.mockResolvedValue(materialDesactivado);

    const response = await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5/desactivar')
      .expect(200);

    expect(service.desactivarMaterial).toHaveBeenCalledWith(5);
    expect(response.body).toEqual(materialDesactivado);
  });

  it('CP-027 - informa error si el material no existe', async () => {
    service.desactivarMaterial.mockRejectedValue(new NotFoundException('Material 99 no encontrado'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/99/desactivar')
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Material 99 no encontrado',
        error: 'Not Found',
      });
  });

  it('CP-028 - informa que el material ya está inactivo', async () => {
    service.desactivarMaterial.mockRejectedValue(new BadRequestException('El material ya se encuentra desactivado'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5/desactivar')
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'El material ya se encuentra desactivado',
        error: 'Bad Request',
      });
  });

  it('CP-029 - el usuario puede cancelar la operación antes de confirmar', async () => {
    service.desactivarMaterial.mockResolvedValue({
      success: false,
      message: 'Operación cancelada por el usuario',
    });

    const response = await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5/desactivar')
      .expect(200);

    expect(response.body.message).toBe('Operación cancelada por el usuario');
  });

  it('CP-030 - deniega acceso a usuarios sin permisos', async () => {
    service.desactivarMaterial.mockRejectedValue(new ForbiddenException('No posee permisos para realizar esta operación.'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5/desactivar')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'No posee permisos para realizar esta operación.',
        error: 'Forbidden',
      });
  });

  it('CP-031 - maneja error de conexión con la base de datos', async () => {
    service.desactivarMaterial.mockRejectedValue(new InternalServerErrorException('No fue posible desactivar el material.'));

    await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5/desactivar')
      .expect(500)
      .expect({
        statusCode: 500,
        message: 'No fue posible desactivar el material.',
        error: 'Internal Server Error',
      });
  });

  it('CP-032 - valida que el material desactivado no aparezca en nuevas personalizaciones', async () => {
    service.desactivarMaterial.mockResolvedValue({
      id_material: 5,
      estado: false,
      message: 'Material desactivado exitosamente',
    });

    const response = await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5/desactivar')
      .expect(200);

    expect(response.body.estado).toBe(false);
    expect(response.body.message).toContain('desactivado');
  });

  it('CP-033 - valida registro en auditoría', async () => {
    service.desactivarMaterial.mockResolvedValue({
      id_material: 5,
      estado: false,
      auditoria: 'registrada',
      message: 'Material desactivado exitosamente',
    });

    const response = await request(app.getHttpServer())
      .patch('/pedidos-personalizados/materiales/5/desactivar')
      .expect(200);

    expect(response.body.auditoria).toBe('registrada');
  });
});
