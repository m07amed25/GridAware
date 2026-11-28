import { Module } from '@nestjs/common';
import { CredentialHasher } from './credential-hasher.js';
import { DeviceCredentialsService } from './device-credentials.service.js';

@Module({
  providers: [CredentialHasher, DeviceCredentialsService],
  exports: [CredentialHasher, DeviceCredentialsService],
})
export class DeviceCredentialsModule {}
