import { Module } from '@nestjs/common';
import { EnvelopeValidatorService } from './envelope-validator.service.js';
import { MqttAuthorizationService } from './mqtt-authorization.service.js';
import { MqttDeviceStatusHandler } from './mqtt-device-status.handler.js';

@Module({
  providers: [
    MqttAuthorizationService,
    EnvelopeValidatorService,
    MqttDeviceStatusHandler,
  ],
  exports: [
    MqttAuthorizationService,
    EnvelopeValidatorService,
    MqttDeviceStatusHandler,
  ],
})
export class MqttAccessModule {}
