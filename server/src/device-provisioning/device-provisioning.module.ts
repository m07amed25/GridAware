import { Module } from '@nestjs/common';
import { DeviceCredentialsModule } from '../device-credentials/device-credentials.module.js';
import { MqttAccessModule } from '../mqtt-access/mqtt-access.module.js';
import { DeviceProvisioningService } from './device-provisioning.service.js';
import { MosquittoFileAdapter } from './mosquitto-file.adapter.js';

@Module({
  imports: [DeviceCredentialsModule, MqttAccessModule],
  providers: [MosquittoFileAdapter, DeviceProvisioningService],
  exports: [DeviceProvisioningService, MosquittoFileAdapter],
})
export class DeviceProvisioningModule {}
