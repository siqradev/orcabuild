// src/application/use-cases/GetItemUseCase.ts

import {
  IItemsRepository,
  ItemResult,
} from '../../domain/repositories/ItemsRepository'

export class GetItemUseCase {
  constructor(private readonly repository: IItemsRepository) {}

  async execute(
    code: string,
    priceTableId: string
  ): Promise<ItemResult | null> {
    return this.repository.findByCode(code, priceTableId)
  }
}
