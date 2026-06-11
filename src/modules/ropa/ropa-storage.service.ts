import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { UploadedImageFile } from './types.uploaded-image-file';

type UploadProductImageOptions = {
  productId?: string;
};

@Injectable()
export class RopaStorageService {
  private readonly maxImageSizeBytes = 5 * 1024 * 1024;
  private readonly allowedMimeTypes = new Map<string, string>([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ]);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Nota para mí:
   * Todas las imágenes de ropa se alojan en Supabase Storage desde el backend.
   * Así el frontend nunca expone una service role key y el admin solo consume
   * este endpoint protegido por JWT + rol ADMIN.
   */
  async uploadProductImage(file: UploadedImageFile | undefined, options: UploadProductImageOptions = {}) {
    this.ensureFileIsValid(file);

    const supabaseUrl = this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
    const serviceRoleKey = this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const bucket = this.configService.get<string>('SUPABASE_ROP_IMAGES_BUCKET') || 'rop-product-images';
    const storagePath = this.buildStoragePath(file!, options.productId);
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': file!.mimetype,
        'Cache-Control': '3600',
        'x-upsert': 'false',
      },
      body: file!.buffer as unknown as BodyInit,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `No se pudo subir la imagen a Supabase Storage. ${errorText}`.trim(),
      );
    }

    return {
      message: 'Imagen subida correctamente',
      data: {
        bucket,
        path: storagePath,
        url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`,
        originalName: file!.originalname,
        mimeType: file!.mimetype,
        sizeBytes: file!.size,
      },
    };
  }

  /**
   * Nota para mí:
   * Este método se usa cuando se elimina una imagen de galería. Si la imagen
   * fue subida a Supabase, también limpio el objeto del bucket para no dejar
   * archivos huérfanos acumulándose.
   */
  async deleteProductImageByPath(storagePath?: string | null) {
    if (!storagePath) return;

    const supabaseUrl = this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
    const serviceRoleKey = this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const bucket = this.configService.get<string>('SUPABASE_ROP_IMAGES_BUCKET') || 'rop-product-images';
    const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text().catch(() => '');
      throw new InternalServerErrorException(
        `No se pudo eliminar la imagen de Supabase Storage. ${errorText}`.trim(),
      );
    }
  }

  private ensureFileIsValid(file: UploadedImageFile | undefined): asserts file is UploadedImageFile {
    if (!file) {
      throw new BadRequestException('Selecciona una imagen para subir');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('La imagen seleccionada está vacía');
    }

    if (file.size > this.maxImageSizeBytes) {
      throw new BadRequestException('La imagen no debe superar los 5 MB');
    }

    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WEBP');
    }
  }

  private buildStoragePath(file: UploadedImageFile, productId?: string) {
    const extension = this.allowedMimeTypes.get(file.mimetype) ?? 'webp';
    const safeProductFolder = productId?.trim() || 'temp';
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const fileId = randomUUID();

    return `products/${safeProductFolder}/${year}/${month}/${fileId}.${extension}`;
  }

  private getRequiredEnv(name: string) {
    const value = this.configService.get<string>(name);
    if (!value?.trim()) {
      throw new InternalServerErrorException(`Falta configurar la variable ${name}`);
    }
    return value.trim();
  }
}
