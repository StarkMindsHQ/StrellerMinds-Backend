import { SetMetadata } from '@nestjs/common';

export const COMMAND_HANDLER_METADATA = 'command_handler';

export const CommandHandler = (commandType: any) => 
  SetMetadata(COMMAND_HANDLER_METADATA, commandType);
