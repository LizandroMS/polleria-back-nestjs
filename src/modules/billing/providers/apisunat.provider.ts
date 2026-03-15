import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ApisunatProvider {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl() {
    return this.configService.get<string>('APISUNAT_BASE_URL') as string | undefined;
  }

  private get token() {
    return this.configService.get<string>('APISUNAT_TOKEN') as string | undefined;
  }

  private ensureConfigured() {
    if (!this.baseUrl || !this.token) {
      throw new InternalServerErrorException(
        'Integración APISUNAT no configurada. Faltan APISUNAT_BASE_URL o APISUNAT_TOKEN',
      );
    }
  }

  private get headers() {
    this.ensureConfigured();

    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async emitDocument(payload: any) {
    this.ensureConfigured();

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/documents`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }

  async getStatus(payload: { documento: string; serie: string; numero: number | string }) {
    this.ensureConfigured();

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/status`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }

  async voidFactura(payload: any) {
    this.ensureConfigured();

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/voided`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }

  async voidBoleta(payload: any) {
    this.ensureConfigured();

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/daily-summary`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }
}
