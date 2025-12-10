import * as fs from 'node:fs';

import { env } from '@documenso/lib/utils/env';

export const getCertificateStatus = () => {
  if (env('NEXT_PRIVATE_SIGNING_TRANSPORT') !== 'local') {
    return { isAvailable: true };
  }

  if (env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS')) {
    return { isAvailable: true };
  }

  const defaultPath =
    env('NODE_ENV') === 'production' ? '/opt/documenso/cert.p12' : './example/cert.p12';

  const filePath = env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH') || defaultPath;

  try {
    fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);

    const stats = fs.statSync(filePath);

    const isAvailable = stats.size > 0;
    
    if (!isAvailable) {
      console.error(`Certificate file found but is empty: ${filePath}`);
    }
    
    return { isAvailable };
  } catch (error) {
    console.error(`Certificate not found at path: ${filePath}`);
    console.error(`NODE_ENV: ${env('NODE_ENV')}`);
    console.error(`NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH: ${env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH') || 'not set'}`);
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
    }
    return { isAvailable: false };
  }
};
