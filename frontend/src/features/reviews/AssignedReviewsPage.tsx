import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function AssignedReviewsPage() {
  const { data: assignments = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['assignedReviews'],
    queryFn: () => api.listAssignedReviews(),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'changes_requested':
        return <Badge variant="warning">Changes Requested</Badge>;
      default:
        return <Badge variant="neutral">Pending Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Reviews</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit and verify candidate cell segmentations assigned to your profile
          </p>
        </div>
        <Badge variant="reviewer">Reviewer Workspace</Badge>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Loading assigned reviews..." />
        </div>
      ) : isError ? (
        <div role="alert" className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 space-y-2">
          <p className="text-sm font-semibold">Failed to load assigned reviews: {(error as Error)?.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-xs font-semibold rounded"
          >
            Retry
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl">
            📋
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-base font-semibold text-slate-800">
              No experiments currently assigned for review
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              When a Researcher selects <strong>&ldquo;Send for Review&rdquo;</strong> and inputs your email address, their segmentation version will appear here for your audit.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
                    {item.experiment.title}
                  </h2>
                  {getStatusBadge(item.status)}
                </div>

                {item.experiment.sampleReference && (
                  <p className="text-[11px] font-mono text-slate-500 mb-2">
                    Sample: <span className="text-slate-800 font-semibold">{item.experiment.sampleReference}</span>
                  </p>
                )}

                {item.experiment.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {item.experiment.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Assigned: {new Date(item.assignedAt).toLocaleDateString()}</span>
                <Link
                  to={`/reviews/${item.id}`}
                  className="px-3.5 py-1.5 font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg transition"
                >
                  Audit & Review →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
