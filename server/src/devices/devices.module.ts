import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { DeviceCredentialsModule } from '../device-credentials/device-credentials.module.js';
import { DeviceProvisioningModule } from '../device-provisioning/device-provisioning.module.js';
import { MqttAccessModule } from '../mqtt-access/mqtt-access.module.js';
import { SensorsModule } from '../sensors/sensors.module.js';
import { DevicesController } from './devices.controller.js';
import { DevicesRepository } from './devices.repository.js';
import { DevicesService } from './devices.service.js';

@Module({
  imports: [
    AuthModule,
    AuthorizationModule,
    DeviceCredentialsModule,
    DeviceProvisioningModule,
    MqttAccessModule,
    SensorsModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesRepository, DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
