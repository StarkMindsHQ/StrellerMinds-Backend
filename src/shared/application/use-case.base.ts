/**
 * Base class for Use Cases
 * Use cases represent a single business operation in the application
 * They orchestrate domain logic and coordinate interactions between domain objects
 */
export abstract class UseCase<IRequest, IResponse> {
  abstract execute(request: IRequest): Promise<IResponse>;
}
