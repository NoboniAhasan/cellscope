import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Experiment, ReviewStatus } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CreateExperimentModal, CreateExperimentFormData } from './CreateExperimentModal';

type SortOrder = 'newest' | 'oldest' | 'title';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [experimentToDelete, setExperimentToDelete] = useState<Experiment | null>(null);

  const {
    data: rawExperiments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['experiments', searchTerm],
    queryFn: () => api.listExperiments({ search: searchTerm }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateExperimentFormData) => api.createExperiment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteExperiment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      setExperimentToDelete(null);
    },
  });

  const handleCreateSubmit = async (data: CreateExperimentFormData) => {
    await createMutation.mutateAsync(data);
  };

  const confirmDelete = async () => {
    if (experimentToDelete) {
      await deleteMutation.mutateAsync(experimentToDelete.id);
    }
  };

  // Filter and Sort Pipeline
  const experiments = useMemo(() => {
    let result = [...rawExperiments];

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.reviewStatus === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [rawExperiments, statusFilter, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Researcher Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage microscopy experiments, audit history, and segmentation runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/comparison"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg border border-slate-200 transition"
          >
            <span>⚖️ Compare Runs</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
          >
            <span className="text-lg leading-none">+</span>
            <span>New Experiment</span>
          </button>
        </div>
      </div>

      {/* Search & History Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search experiments by title or sample ID..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm" aria-hidden="true">
            🔍
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Review Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="changes_requested">Changes Requested</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Loading experiments..." />
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 space-y-3"
        >
          <p className="text-sm font-medium">
            Failed to load experiments: {(error as Error)?.message || 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition"
          >
            Retry
          </button>
        </div>
      ) : experiments.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xl mb-3">
            🔬
          </div>
          <h2 className="text-base font-semibold text-slate-800">
            {searchTerm || statusFilter !== 'all' ? 'No matching experiments found' : 'No experiments yet'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search keywords or filter criteria.'
              : 'Create your first experiment to begin organizing microscopy image sets.'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Create Experiment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
                    {exp.title}
                  </h2>
                  <div className="flex flex-col items-end gap-1">
                    {exp.isDemo && <Badge variant="demo">Demo result</Badge>}
                    {exp.reviewStatus && (
                      <Badge
                        variant={
                          exp.reviewStatus === 'approved'
                            ? 'success'
                            : exp.reviewStatus === 'changes_requested'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {exp.reviewStatus.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>

                {exp.sampleReference && (
                  <div className="mb-2.5">
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      Ref: {exp.sampleReference}
                    </span>
                  </div>
                )}

                {exp.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {exp.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {new Date(exp.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExperimentToDelete(exp)}
                    className="px-2.5 py-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                  >
                    Delete
                  </button>
                  <Link
                    to={`/experiments/${exp.id}`}
                    className="px-3 py-1 font-medium text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/70 rounded transition"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Experiment Modal */}
      <CreateExperimentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!experimentToDelete}
        onClose={() => setExperimentToDelete(null)}
        title="Confirm Delete Experiment"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">&ldquo;{experimentToDelete?.title}&rdquo;</strong>?
            This will remove all associated mock records and cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setExperimentToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Experiment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
