import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: Number(this.configService.get<string>('MAIL_PORT') ?? 587),
      secure: Number(this.configService.get<string>('MAIL_PORT') ?? 587) === 465,
      auth:
        this.configService.get<string>('MAIL_USER') && this.configService.get<string>('MAIL_PASS')
          ? {
              user: this.configService.get<string>('MAIL_USER'),
              pass: this.configService.get<string>('MAIL_PASS'),
            }
          : undefined,
    });
  }

  private ensureConfigured() {
    const required = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_FROM'] as const;
    const missing = required.filter((key) => !this.configService.get<string>(key));

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Configuración de correo incompleta: faltan ${missing.join(', ')}`,
      );
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    this.ensureConfigured();

    try {
      await this.transporter.sendMail({
        from: this.configService.getOrThrow<string>('MAIL_FROM'),
        to,
        subject: 'Recuperación de contraseña',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Recupera tu contraseña</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p>
              <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#c96a3d;color:#fff;text-decoration:none;border-radius:8px;">
                Restablecer contraseña
              </a>
            </p>
            <p>Este enlace expira en 30 minutos.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        `,
      });
    } catch (error: any) {
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${to}: ${error?.message ?? 'Error desconocido'}`,
      );
      throw new InternalServerErrorException('No se pudo enviar el correo de recuperación');
    }
  }
}
