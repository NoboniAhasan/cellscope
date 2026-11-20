import { Badge } from '../../components/Badge';

export function AssignedReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Reviews</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit and verify experiment candidate object segmentations
          </p>
        </div>
        <Badge variant="reviewer">Reviewer Workspace</Badge>
      </div>

      {/* Reviewer Notice & Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl">
          📋
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-base font-semibold text-slate-800">
            No experiments currently assigned for review
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            As a Reviewer, you only see experiments explicitly assigned to your email address by Researchers.
            The review assignment, annotations, and approval workflow will be unlocked in <strong>Milestone M4</strong>.
          </p>
        </div>

        <div className="pt-2">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            ✓ Access control enforced: Reviewers only view assigned experiments
          </span>
        </div>
      </div>
    </div>
  );
}
