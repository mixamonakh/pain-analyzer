import crypto from 'crypto';

export function md5Hash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}
