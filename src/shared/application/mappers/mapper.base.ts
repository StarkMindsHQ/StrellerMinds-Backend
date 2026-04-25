/**
 * Base class for Mappers
 * Mappers handle the conversion between domain entities and DTOs
 * They ensure the isolation between domain logic and the outside world
 */
export abstract class Mapper<DomainEntity, DTO> {
  /**
   * Convert domain entity to DTO
   */
  abstract toPersistence(entity: DomainEntity): any;

  /**
   * Convert DTO to domain entity
   */
  abstract toDomain(raw: any): DomainEntity;

  /**
   * Convert domain entity to HTTP response DTO
   */
  abstract toDTO(entity: DomainEntity): DTO;
}
