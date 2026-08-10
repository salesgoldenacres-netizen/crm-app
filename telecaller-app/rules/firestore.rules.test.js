/**
 * Firestore security rules unit tests (DO-1 / SEC-1).
 * Run via: npm run test:rules (starts Firestore + Storage emulators).
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
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT_ID = 'golden-acres-rules-test';

const AGENT_UID = 'agent-auth-uid';
const OTHER_UID = 'other-auth-uid';
const MANAGER_UID = 'manager-auth-uid';
const AGENT_DOC_ID = 'agent-user-doc';
const OTHER_DOC_ID = 'other-user-doc';
const LEAD_ID = 'lead-owned';
const OTHER_LEAD_ID = 'lead-other';
const UNASSIGNED_LEAD_ID = 'lead-unassigned';

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', AGENT_DOC_ID), {
      uid: AGENT_UID,
      email: 'agent@example.com',
    });
    await setDoc(doc(db, 'users', OTHER_DOC_ID), {
      uid: OTHER_UID,
      email: 'other@example.com',
    });
    await setDoc(doc(db, 'leads', LEAD_ID), {
      assignedTo: AGENT_DOC_ID,
      assignedToUid: AGENT_UID,
      name: 'Owned lead',
    });
    await setDoc(doc(db, 'leads', OTHER_LEAD_ID), {
      assignedTo: OTHER_DOC_ID,
      assignedToUid: OTHER_UID,
      name: 'Other lead',
    });
    await setDoc(doc(db, 'leads', UNASSIGNED_LEAD_ID), {
      assignedTo: '',
      assignedToUid: '',
      name: 'Unassigned lead',
    });
    await setDoc(doc(db, 'callLogs', 'log-owned'), {
      leadId: LEAD_ID,
      durationSec: 30,
    });
    await setDoc(doc(db, 'callLogs', 'log-other'), {
      leadId: OTHER_LEAD_ID,
      durationSec: 30,
    });
    await setDoc(doc(db, 'timelineEvents', 'tl-owned'), {
      leadId: LEAD_ID,
      type: 'note_added',
    });
    await setDoc(doc(db, 'timelineEvents', 'tl-other'), {
      leadId: OTHER_LEAD_ID,
      type: 'note_added',
    });
    await setDoc(doc(db, 'whatsappMessages', 'wa-owned'), {
      leadId: LEAD_ID,
      text: 'hi',
    });
    await setDoc(doc(db, 'whatsappConversations', 'conv-owned'), {
      leadId: LEAD_ID,
      assignedTo: AGENT_DOC_ID,
    });
    await setDoc(doc(db, 'attendance', 'att-agent'), {
      userId: AGENT_DOC_ID,
      date: '2026-01-01',
    });
    await setDoc(doc(db, 'attendance', 'att-other'), {
      userId: OTHER_DOC_ID,
      date: '2026-01-01',
    });
  });
});

function authed(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims);
}

describe('Firestore rules — leads (SEC-1 CLOSED)', () => {
  it('denies unauthenticated lead read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'leads', LEAD_ID)));
  });

  it('allows owner to read assigned lead via assignedToUid', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'leads', LEAD_ID)));
  });

  it('denies cross-agent lead read (SEC-1 CLOSED)', async () => {
    const db = authed(OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, 'leads', LEAD_ID)));
  });

  it('allows any authenticated user to read unassigned leads', async () => {
    const db = authed(OTHER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'leads', UNASSIGNED_LEAD_ID)));
  });

  it('allows managerial claim to read any lead', async () => {
    const db = authed(MANAGER_UID, { managerial: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'leads', LEAD_ID)));
    await assertSucceeds(getDoc(doc(db, 'leads', OTHER_LEAD_ID)));
  });

  it('allows assigned agent to update owned lead fields', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'leads', LEAD_ID), { name: 'Updated by owner' }),
    );
  });

  it('denies non-owner lead update', async () => {
    const db = authed(OTHER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'leads', LEAD_ID), { name: 'Stolen update' }),
    );
  });

  it('denies owner reassignment of assignedTo', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'leads', LEAD_ID), { assignedTo: OTHER_DOC_ID }),
    );
  });
});

describe('Firestore rules — callLogs (H2 scoped reads)', () => {
  it('allows assigned agent to read call log for owned lead', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'callLogs', 'log-owned')));
  });

  it('denies call log read for lead owned by another agent', async () => {
    const db = authed(OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, 'callLogs', 'log-owned')));
  });

  it('allows assigned agent to create call log for owned lead', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'callLogs', 'log-1'), {
        leadId: LEAD_ID,
        durationSec: 30,
      }),
    );
  });

  it('denies call log create for lead owned by another agent', async () => {
    const db = authed(OTHER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'callLogs', 'log-bad'), {
        leadId: LEAD_ID,
        durationSec: 30,
      }),
    );
  });
});

describe('Firestore rules — timelineEvents (H2 scoped reads)', () => {
  it('allows owner to read timeline on owned lead', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'timelineEvents', 'tl-owned')));
  });

  it('denies cross-owner timeline read', async () => {
    const db = authed(OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, 'timelineEvents', 'tl-owned')));
  });
});

describe('Firestore rules — WhatsApp (H2 scoped reads)', () => {
  it('denies client create on canonical whatsappMessages', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'whatsappMessages', 'msg-1'), { body: 'hello' }),
    );
  });

  it('allows owner to read whatsapp message on owned lead', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'whatsappMessages', 'wa-owned')));
  });

  it('denies cross-owner whatsapp message read', async () => {
    const db = authed(OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, 'whatsappMessages', 'wa-owned')));
  });

  it('allows owner to read assigned conversation', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'whatsappConversations', 'conv-owned')));
  });

  it('denies client create on whatsappConversations', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'whatsappConversations', 'conv-1'), { leadId: LEAD_ID }),
    );
  });
});

describe('Firestore rules — attendance (managerial or self)', () => {
  it('allows agent to read own attendance', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'attendance', 'att-agent')));
  });

  it('denies agent reading another user attendance', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertFails(getDoc(doc(db, 'attendance', 'att-other')));
  });

  it('allows managerial claim to read any attendance', async () => {
    const db = authed(MANAGER_UID, { managerial: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'attendance', 'att-other')));
  });
});

describe('Firestore rules — auditLogs (client create denied)', () => {
  it('denies client audit log create', async () => {
    const db = authed(AGENT_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'auditLogs', 'audit-1'), {
        action: 'test',
        details: 'x',
        user: 'agent',
      }),
    );
  });
});
