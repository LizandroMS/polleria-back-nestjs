/**
 * Nota para mí:
 * Mantengo este tipo mínimo para no depender de Express.Multer.File en el código
 * de negocio. El interceptor de Nest entrega estos campos cuando recibe multipart/form-data.
 */
export type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};
