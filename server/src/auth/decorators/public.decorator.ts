import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'gridaware.auth.isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
