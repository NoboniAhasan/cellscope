import { describe, it, expect, beforeEach } from 'vitest';
import { MockAdapter } from '../index';
import { mockStorage } from '../storage';

describe('MockAdapter Auth and Experiments', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    mockStorage.reset();
    adapter = new MockAdapter();
  });

  it('registers a new user and rejects duplicate email', async () => {
    const res = await adapter.register({
      name: 'Alice Cooper',
      email: 'alice@lab.org',
      password: 'mypassword',
      role: 'researcher',
    });

    expect(res.user.email).toBe('alice@lab.org');
    expect(res.user.role).toBe('researcher');
    expect(res.token).toBeDefined();

    // Try registering same email
    await expect(
      adapter.register({
        name: 'Alice Duplicate',
        email: 'alice@lab.org',
        password: 'otherpassword',
        role: 'researcher',
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE_EMAIL',
    });
  });

  it('logs in seeded researcher and rejects invalid credentials', async () => {
    const res = await adapter.login({
      email: 'researcher@cellscope.org',
      password: 'password123',
    });

    expect(res.user.email).toBe('researcher@cellscope.org');
    expect(res.user.role).toBe('researcher');

    // Invalid password
    await expect(
      adapter.login({
        email: 'researcher@cellscope.org',
        password: 'wrongpassword',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('creates, lists, searches, gets and deletes experiments', async () => {
    // Log in first
    await adapter.login({
      email: 'researcher@cellscope.org',
      password: 'password123',
    });

    const exp = await adapter.createExperiment({
      title: 'Zebrafish Embryo Segmentation',
      sampleReference: 'ZF-001',
      description: 'High magnification confocal scan',
    });

    expect(exp.id).toBeDefined();
    expect(exp.title).toBe('Zebrafish Embryo Segmentation');
    expect(exp.isDemo).toBe(true);

    // List experiments
    const all = await adapter.listExperiments();
    expect(all.some((e) => e.title === 'Zebrafish Embryo Segmentation')).toBe(true);

    // Search
    const searchResult = await adapter.listExperiments({ search: 'Zebrafish' });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].sampleReference).toBe('ZF-001');

    // Get by ID
    const fetched = await adapter.getExperiment(exp.id);
    expect(fetched.id).toBe(exp.id);

    // Delete
    await adapter.deleteExperiment(exp.id);
    const afterDelete = await adapter.listExperiments();
    expect(afterDelete.some((e) => e.id === exp.id)).toBe(false);
  });
});
