import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ReviewAnnotation, ReviewAssignment, ReviewComment } from '../../types';

interface ReviewFeedbackPanelProps {
  reviewAssignment: ReviewAssignment;
  annotations: ReviewAnnotation[];
  comments: ReviewComment[];
  onApplyCorrectionNotice?: () => void;
}

export function ReviewFeedbackPanel({
  reviewAssignment,
  annotations,
  comments,
}: ReviewFeedbackPanelProps) {
  const queryClient = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'accepted' | 'rejected' }) =>
      api.resolveAnnotation(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewAssignment.id] });
      queryClient.invalidateQueries({ queryKey: ['assignedReviews'] });
    },
  });

  const statusStyle = {
    pending: 'bg-amber-50 border-amber-200 text-amber-800',
    approved: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    changes_requested: 'bg-amber-50 border-amber-300 text-amber-900',
  }[reviewAssignment.status];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm space-y-4 ${statusStyle}`}>
      <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Reviewer Feedback</h3>
            <p className="text-[11px] opacity-80">
              Assigned Reviewer Audit — Status: <strong className="uppercase">{reviewAssignment.status.replace('_', ' ')}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Annotations List */}
      {annotations.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold block uppercase tracking-wider">
            Reviewer Suggestions ({annotations.length})
          </span>
          <div className="space-y-2">
            {annotations.map((a) => (
              <div
                key={a.id}
                className="bg-white/80 border border-slate-200 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">
                      {a.objectId ? `Target: Candidate Object #${a.objectId}` : 'General Suggestion'}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded uppercase ${
                        a.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : a.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{a.suggestion}</p>
                </div>

                {a.status === 'open' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => resolveMutation.mutate({ id: a.id, status: 'accepted' })}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveMutation.mutate({ id: a.id, status: 'rejected' })}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviewer Comments Feed */}
      {comments.length > 0 && (
        <div className="pt-2 border-t border-amber-200/60 space-y-1.5">
          <span className="text-xs font-semibold block uppercase tracking-wider">Reviewer Notes</span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="bg-white/60 p-2 rounded-lg text-[11px] text-slate-700">
                <span className="font-bold text-slate-800">{c.authorName}: </span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
