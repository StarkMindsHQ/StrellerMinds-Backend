import { SetMetadata } from '@nestjs/common';

export const QUERY_HANDLER_METADATA = 'query_handler';

export const QueryHandler = (queryType: any) => 
  SetMetadata(QUERY_HANDLER_METADATA, queryType);
