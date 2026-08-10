/**
 * Firebase Storage security rules unit tests (DO-1).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { getBytes, ref, uploadString } from 'firebase/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT_ID = 'golden-acres-rules-test';

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const storage = context.storage();
    await uploadString(ref(storage, 'layouts/site.png'), 'seed', 'raw', {
      contentType: 'image/png',
    });
  });
});

function authed(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims);
}

describe('Storage rules', () => {
  it('denies unauthenticated read on layouts', async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(storage, 'layouts/site.png')));
  });

  it('denies authenticated write to unknown paths (default deny)', async () => {
    const storage = authed('user-1').storage();
    await assertFails(
      uploadString(ref(storage, 'uploads/random.png'), 'data', 'raw', {
        contentType: 'image/png',
      }),
    );
  });

  it('denies non-admin write to layouts', async () => {
    const storage = authed('agent-1').storage();
    await assertFails(
      uploadString(ref(storage, 'layouts/site.png'), 'data', 'raw', {
        contentType: 'image/png',
      }),
    );
  });

  it('allows admin image upload to layouts', async () => {
    const storage = authed('admin-1', { managerial: true }).storage();
    await assertSucceeds(
      uploadString(ref(storage, 'layouts/admin.png'), 'data', 'raw', {
        contentType: 'image/png',
      }),
    );
  });
});
