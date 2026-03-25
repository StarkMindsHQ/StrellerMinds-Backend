import { Module } from '@nestjs/common';

// This module exports service interfaces for use across the application
// Interfaces are types and don't need to be provided as values

@Module({
  providers: [],
  exports: [],
})
export class ServiceInterfacesModule {}
