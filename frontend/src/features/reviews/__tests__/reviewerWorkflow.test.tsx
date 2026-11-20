import { describe, it, expect, beforeEach } from 'vitest';
import { MockAdapter } from '../../../services/mock';
import { mockStorage } from '../../../services/mock/storage';

describe('Milestone M4 — Reviewer Workflow & Access Control', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    mockStorage.reset();
    adapter = new MockAdapter();
  });

  it('completes the full researcher -> review assignment -> decision loop', async () => {
    // 1. Researcher logs in & runs automated analysis
    const researcherAuth = await adapter.login({
      email: 'researcher@cellscope.org',
      password: 'password123',
    });
    expect(researcherAuth.user.role).toBe('researcher');

    const run = await adapter.runAnalysis({
      experimentId: 1,
      fileId: 101,
      parameters: {
        preset: 'fluorescence',
        polarity: 'bright_on_dark',
        blurSigma: 1.5,
        thresholdMethod: 'otsu',
        minArea: 100,
        maxArea: 5000,
      },
    });

    // 2. Researcher sends version for review to reviewer@cellscope.org
    const assignment = await adapter.sendForReview({
      runId: run.id,
      reviewerEmail: 'reviewer@cellscope.org',
    });

    expect(assignment.id).toBeDefined();
    expect(assignment.status).toBe('pending');
    expect(assignment.researcherId).toBe(researcherAuth.user.id);

    const expAfterSend = await adapter.getExperiment(1);
    expect(expAfterSend.reviewStatus).toBe('pending');

    // 3. Reviewer logs in
    const reviewerAuth = await adapter.login({
      email: 'reviewer@cellscope.org',
      password: 'password123',
    });
    expect(reviewerAuth.user.role).toBe('reviewer');

    // 4. Reviewer list shows assigned experiment
    const assignedReviews = await adapter.listAssignedReviews();
    expect(assignedReviews.length).toBe(1);
    expect(assignedReviews[0].experiment.id).toBe(1);
    expect(assignedReviews[0].id).toBe(assignment.id);

    // 5. Reviewer inspects the review bundle
    const reviewBundle = await adapter.getReview(assignment.id);
    expect(reviewBundle.assignment.id).toBe(assignment.id);
    expect(reviewBundle.comments.length).toBe(0);
    expect(reviewBundle.annotations.length).toBe(0);

    // 6. Reviewer adds an object-specific annotation & comment
    const annotation = await adapter.addAnnotation(assignment.id, {
      objectId: 3,
      suggestion: 'Candidate object #3 is staining debris; recommend deletion.',
    });
    expect(annotation.objectId).toBe(3);
    expect(annotation.status).toBe('open');
    expect(annotation.authorId).toBe(reviewerAuth.user.id);
    expect(annotation.createdAt).toBeDefined();

    const comment = await adapter.addComment(
      assignment.id,
      'Initial audit complete. Please inspect candidate #3.',
    );
    expect(comment.authorName).toBe('Dr. Marcus Reed');
    expect(comment.text).toBe('Initial audit complete. Please inspect candidate #3.');

    // 7. Reviewer decides: Request Changes
    const decided = await adapter.decide(assignment.id, {
      decision: 'changes_requested',
      comment: 'Please remove false debris detection #3.',
    });
    expect(decided.status).toBe('changes_requested');

    // Check experiment status updated
    const expDecided = await adapter.getExperiment(1);
    expect(expDecided.reviewStatus).toBe('changes_requested');

    // 8. Researcher logs back in to inspect feedback and resolve annotation
    await adapter.login({
      email: 'researcher@cellscope.org',
      password: 'password123',
    });

    const resolved = await adapter.resolveAnnotation(annotation.id, 'accepted');
    expect(resolved.status).toBe('accepted');
  });

  it('denies access (403 Forbidden) for unassigned reviewer', async () => {
    // Researcher creates assignment for reviewer 2
    await adapter.login({ email: 'researcher@cellscope.org', password: 'password123' });
    const run = await adapter.runAnalysis({
      experimentId: 1,
      fileId: 101,
      parameters: {
        preset: 'fluorescence',
        polarity: 'bright_on_dark',
        blurSigma: 1.5,
        thresholdMethod: 'otsu',
        minArea: 100,
        maxArea: 5000,
      },
    });

    const assignment = await adapter.sendForReview({
      runId: run.id,
      reviewerEmail: 'reviewer@cellscope.org',
    });

    // Register a second unrelated reviewer
    await adapter.register({
      name: 'Dr. Unassigned Reviewer',
      email: 'other_reviewer@cellscope.org',
      password: 'password123',
      role: 'reviewer',
    });

    // Attempting to access unassigned review -> 403 FORBIDDEN
    await expect(adapter.getReview(assignment.id)).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });

    // Attempting to view unassigned experiment -> 403 FORBIDDEN
    await expect(adapter.getExperiment(1)).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });

    // Unassigned reviewer list should be empty
    const reviews = await adapter.listAssignedReviews();
    expect(reviews.length).toBe(0);
  });
});
