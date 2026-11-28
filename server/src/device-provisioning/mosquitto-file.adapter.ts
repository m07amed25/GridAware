import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

export interface BrokerProvisioningAdapter {
  syncDeviceAccess(params: {
    username: string;
    plaintextPassword?: string;
    publishTopics: readonly string[];
    enabled: boolean;
  }): Promise<void>;
  removeDeviceAccess(username: string): Promise<void>;
}

/**
 * Local Mosquitto ACL/password file adapter for development & integration tests.
 * Production deployments should replace this with a dynamic security or HTTP auth plugin over TLS.
 */
@Injectable()
export class MosquittoFileAdapter implements BrokerProvisioningAdapter {
  private readonly logger = new Logger(MosquittoFileAdapter.name);
  private readonly aclFilePath = process.env.MOSQUITTO_ACL_FILE ?? '';

  async syncDeviceAccess(params: {
    username: string;
    plaintextPassword?: string;
    publishTopics: readonly string[];
    enabled: boolean;
  }): Promise<void> {
    if (!this.aclFilePath) {
      this.logger.debug(
        `MOSQUITTO_ACL_FILE not set; skipping local ACL file sync for user=${params.username}`,
      );
      return;
    }

    await fs.mkdir(dirname(this.aclFilePath), { recursive: true });
    let existing = '';
    try {
      existing = await fs.readFile(this.aclFilePath, 'utf8');
    } catch {
      existing = '';
    }

    const updated = this.rewriteUserBlock(
      existing,
      params.username,
      params.enabled ? params.publishTopics : [],
    );
    await fs.writeFile(this.aclFilePath, updated, 'utf8');
  }

  async removeDeviceAccess(username: string): Promise<void> {
    await this.syncDeviceAccess({
      username,
      publishTopics: [],
      enabled: false,
    });
  }

  private rewriteUserBlock(
    content: string,
    username: string,
    publishTopics: readonly string[],
  ): string {
    const startMarker = `# BEGIN ${username}`;
    const endMarker = `# END ${username}`;
    const pattern = new RegExp(
      `${escapeRegex(startMarker)}[\\s\\S]*?${escapeRegex(endMarker)}\\n?`,
      'g',
    );
    const cleaned = content.replace(pattern, '').trimEnd();

    if (publishTopics.length === 0) {
      return cleaned ? `${cleaned}\n` : '';
    }

    const lines = [
      startMarker,
      `user ${username}`,
      ...publishTopics.map((topic) => `topic write ${topic}`),
      endMarker,
    ];
    return `${cleaned ? `${cleaned}\n\n` : ''}${lines.join('\n')}\n`;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
