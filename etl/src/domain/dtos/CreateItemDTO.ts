// src/domain/dtos/CreateItemDTO.ts
// Objeto de transferência de dados entre camadas

export interface CreateItemDTO {
  code: string
  description: string
  unit: string
  type: 'INSUMO' | 'COMPOSICAO'
  category?: string | null
  basePrice?: number | null
  priceTableId: string
  
}
