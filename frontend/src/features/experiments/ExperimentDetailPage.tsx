import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const experimentId = Number(id);

  const {
    data: experiment,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: () => api.getExperiment(experimentId),
    enabled: !isNaN(experimentId),
  });

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" label="Loading experiment..." />
      </div>
    );
  }

  if (isError || !experiment) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Experiment Not Found</h2>
        <p className="text-sm text-slate-600">
          {(error as Error)?.message || 'The requested experiment could not be loaded or does not exist.'}
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/dashboard"
          className="text-xs font-medium text-slate-500 hover:text-teal-700 transition flex items-center gap-1"
        >
          <span>← Back to Dashboard</span>
        </Link>
      </div>

      {/* Experiment Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {experiment.title}
              </h1>
              {experiment.isDemo && <Badge variant="demo">Demo result</Badge>}
            </div>

            {experiment.sampleReference && (
              <p className="text-xs font-mono font-medium text-slate-500">
                Sample ID: <span className="text-slate-800">{experiment.sampleReference}</span>
              </p>
            )}

            {experiment.description && (
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                {experiment.description}
              </p>
            )}
          </div>

          <div className="text-xs text-slate-400 sm:text-right shrink-0">
            <div>Created: {new Date(experiment.createdAt).toLocaleDateString()}</div>
            <div>Updated: {new Date(experiment.updatedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Images Section Empty State (Core Slice for M2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-3xl">
          🖼️
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-base font-semibold text-slate-900">
            No microscopy images uploaded yet
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The core analysis vertical slice (image upload, pre-run quality checks, candidate object detection on Konva canvas, and metrics computation) is activated in <strong>Milestone M2</strong>.
          </p>
        </div>

        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
            <span>⚙️ Milestone M2 Pipeline Target</span>
          </span>
        </div>
      </div>
    </div>
  );
}
