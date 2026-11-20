import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AnalysisCanvas } from '../image-editor/AnalysisCanvas';
import { MeasurementsTable } from '../analysis/MeasurementsTable';
import { SizeHistogram } from '../analysis/SizeHistogram';
import { ObjectDetailCard } from '../analysis/ObjectDetailCard';

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reviewId = Number(id);
  const queryClient = useQueryClient();

  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [minAreaFilter, setMinAreaFilter] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [decisionComment, setDecisionComment] = useState('');

  // 1. Fetch Review Bundle
  const {
    data: reviewData,
    isLoading: isLoadingReview,
    isError: isReviewError,
    error: reviewError,
  } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => api.getReview(reviewId),
    enabled: !isNaN(reviewId),
    retry: false,
  });

  const assignment = reviewData?.assignment;
  const comments = reviewData?.comments || [];
  const annotations = reviewData?.annotations || [];

  // 2. Fetch Experiment & Run
  const { data: experiment } = useQuery({
    queryKey: ['experiment', assignment?.experimentId],
    queryFn: () => api.getExperiment(assignment!.experimentId),
    enabled: !!assignment,
  });

  const { data: run } = useQuery({
    queryKey: ['run', assignment?.runId],
    queryFn: () => api.getAnalysis(assignment!.runId),
    enabled: !!assignment,
  });

  const { data: measurements = [] } = useQuery({
    queryKey: ['measurements', assignment?.runId],
    queryFn: () => api.getMeasurements(assignment!.runId),
    enabled: !!assignment,
  });

  const activeFile = experiment?.files?.[0];

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: (text: string) => api.addComment(reviewId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
      setCommentText('');
    },
  });

  const addAnnotationMutation = useMutation({
    mutationFn: (suggestion: string) =>
      api.addAnnotation(reviewId, {
        objectId: selectedObjectId || undefined,
        suggestion,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
      setSuggestionText('');
    },
  });

  const decideMutation = useMutation({
    mutationFn: (decision: 'approved' | 'changes_requested') =>
      api.decide(reviewId, { decision, comment: decisionComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['assignedReviews'] });
      setDecisionComment('');
    },
  });

  const selectedMeasurement = measurements.find((m) => m.id === selectedObjectId) || null;
  const filteredMeasurements = measurements.filter((m) => m.area >= minAreaFilter);

  if (isLoadingReview) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading review audit workspace..." />
      </div>
    );
  }

  // 403 Forbidden Access Control Check
  if (isReviewError || !assignment) {
    const isForbidden = (reviewError as any)?.status === 403;
    return (
      <div className="max-w-lg mx-auto my-14 p-8 bg-white border border-red-200 rounded-2xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mx-auto">
          ⛔
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          {isForbidden ? 'Access Denied (403 Forbidden)' : 'Review Not Found'}
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {isForbidden
            ? 'You are not assigned to review this experiment. Access is restricted exclusively to the designated reviewer.'
            : (reviewError as Error)?.message || 'The requested review assignment does not exist.'}
        </p>
        <Link
          to="/reviews"
          className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
        >
          ← Return to Assigned Reviews
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/reviews"
          className="text-xs font-medium text-slate-500 hover:text-emerald-700 transition flex items-center gap-1"
        >
          <span>← Back to Assigned Reviews</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="demo">Demo result</Badge>
          <Badge
            variant={
              assignment.status === 'approved'
                ? 'success'
                : assignment.status === 'changes_requested'
                ? 'warning'
                : 'neutral'
            }
          >
            Review Status: {assignment.status}
          </Badge>
        </div>
      </div>

      {/* Review Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Review: {experiment?.title || 'Microscopy Experiment'}
            </h1>
            <p className="text-xs text-slate-500">
              Audit specimen segmentation version v{run?.version || 1} ({run?.objectCount} candidate objects detected).
            </p>
            {experiment?.sampleReference && (
              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600 inline-block mt-1">
                Sample ID: {experiment.sampleReference}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 sm:text-right shrink-0 space-y-0.5">
            <div>Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</div>
            <div className="text-emerald-700 font-medium">Read-Only Audit Mode</div>
          </div>
        </div>
      </div>

      {/* Main Review Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas, Histogram, Table (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeFile && (
            <AnalysisCanvas
              imageUrl={activeFile.originalUrl}
              measurements={measurements}
              selectedObjectId={selectedObjectId}
              onSelectObject={(id) => setSelectedObjectId(id)}
              filteredMeasurements={filteredMeasurements}
              editMode="inspect"
            />
          )}

          {measurements.length > 0 && (
            <SizeHistogram
              measurements={measurements}
              minAreaFilter={minAreaFilter}
              onMinAreaFilterChange={(val) => setMinAreaFilter(val)}
            />
          )}

          {measurements.length > 0 && (
            <MeasurementsTable
              measurements={filteredMeasurements}
              selectedObjectId={selectedObjectId}
              onSelectObject={(id) => setSelectedObjectId(id)}
            />
          )}
        </div>

        {/* Right Column: Reviewer Actions & Annotations (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Formal Decision Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Audit Decision</h3>
            <textarea
              rows={2}
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
              placeholder="Optional summary remarks on decision..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => decideMutation.mutate('approved')}
                disabled={decideMutation.isPending}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                ✓ Approve
              </button>
              <button
                type="button"
                onClick={() => decideMutation.mutate('changes_requested')}
                disabled={decideMutation.isPending}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                ⚠️ Request Changes
              </button>
            </div>
          </div>

          {/* Add Object-Specific Suggestion */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Targeted Suggestion</h3>
              {selectedObjectId ? (
                <span className="text-[11px] font-mono text-cyan-700 font-bold">
                  Target: #{selectedObjectId}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">General Region</span>
              )}
            </div>

            <input
              type="text"
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder={
                selectedObjectId
                  ? `e.g. Object #${selectedObjectId} appears to be debris`
                  : 'Click a candidate object on canvas first...'
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            />

            <button
              type="button"
              onClick={() => {
                if (suggestionText.trim()) {
                  addAnnotationMutation.mutate(suggestionText.trim());
                }
              }}
              disabled={!suggestionText.trim() || addAnnotationMutation.isPending}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition disabled:opacity-40"
            >
              Add Suggestion
            </button>

            {/* List Existing Annotations */}
            {annotations.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto">
                <span className="text-[11px] font-semibold text-slate-700 block">Recorded Suggestions:</span>
                {annotations.map((a) => (
                  <div key={a.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800">
                        {a.objectId ? `Object #${a.objectId}` : 'General Area'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
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
                ))}
              </div>
            )}
          </div>

          {/* Discussion Thread */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Review Discussion</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No comments posted yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800">{c.authorName}</span>
                      <span className="text-slate-400">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-[11px]">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
              <button
                type="button"
                onClick={() => {
                  if (commentText.trim()) {
                    addCommentMutation.mutate(commentText.trim());
                  }
                }}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>

          {/* Active Candidate Inspector */}
          {selectedMeasurement && (
            <ObjectDetailCard
              measurement={selectedMeasurement}
              onDeselect={() => setSelectedObjectId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
