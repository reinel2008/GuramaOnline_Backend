// task/task.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class TaskService {

    private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false, 
    },
    });

async enviarCodigoReset(correo: string, codigo: string) {
    await this.transporter.sendMail({
        from: `"Gurama Online" <${process.env.MAIL_USER}>`,
        to: correo,
        subject: 'Recuperación de contraseña - Gurama Online',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #c5749d;">Gurama Online</h2>
            <p>Hola, recibimos una solicitud para restablecer tu contraseña.</p>
            <p>Tu código de verificación es:</p>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #5a3d54; letter-spacing: 8px; font-size: 36px;">${codigo}</h1>
            </div>
            <p style="color: #666;">Este código expira en <strong>15 minutos</strong>.</p>
            <p style="color: #666;">Si no solicitaste esto, ignora este correo.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Gurama Online — Productos Artesanales</p>
            </div>
        `,
        });
    }
}