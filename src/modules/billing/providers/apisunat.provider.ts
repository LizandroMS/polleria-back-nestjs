import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ApisunatProvider {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl() {
    return this.configService.get<string>('APISUNAT_BASE_URL') as string;
  }

  private get token() {
    return this.configService.get<string>('APISUNAT_TOKEN') as string;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async emitDocument(payload: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/documents`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }

  async getStatus(payload: { documento: string; serie: string; numero: number | string }) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/status`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }

  async voidFactura(payload: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/voided`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }

  async voidBoleta(payload: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/daily-summary`, payload, {
        headers: this.headers,
      }),
    );

    return response.data;
  }
}