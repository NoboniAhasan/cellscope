import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AnalysisParameters } from '../../types';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ImageUploadZone } from './ImageUploadZone';
import { AnalysisSettingsPanel } from '../analysis/AnalysisSettingsPanel';
import { QualityWarningBanner } from '../analysis/QualityWarningBanner';
import { AnalysisCanvas, CanvasEditMode } from '../image-editor/AnalysisCanvas';
import { MeasurementsTable } from '../analysis/MeasurementsTable';
import { ObjectDetailCard } from '../analysis/ObjectDetailCard';
import { SizeHistogram } from '../analysis/SizeHistogram';
import { useCorrectionHistory } from '../image-editor/useCorrectionHistory';
import { SaveVersionModal } from '../analysis/SaveVersionModal';
import { VersionHistoryPanel } from '../analysis/VersionHistoryPanel';
import { SendForReviewModal } from '../reviews/SendForReviewModal';
import { ReviewFeedbackPanel } from '../reviews/ReviewFeedbackPanel';

const DEFAULT_PARAMETERS: AnalysisParameters = {
  preset: 'fluorescence',
  polarity: 'bright_on_dark',
  blurSigma: 1.5,
  thresholdMethod: 'otsu',
  minArea: 100,
  maxArea: 5000,
};

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const experimentId = Number(id);
  const queryClient = useQueryClient();

  const [parameters, setParameters] = useState<AnalysisParameters>(DEFAULT_PARAMETERS);
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [minAreaDisplayFilter, setMinAreaDisplayFilter] = useState(0);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<CanvasEditMode>('inspect');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSendReviewOpen, setIsSendReviewOpen] = useState(false);

  // 1. Fetch Experiment
  const {
    data: experiment,
    isLoading: isLoadingExp,
    isError: isExpError,
    error: expError,
  } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: () => api.getExperiment(experimentId),
    enabled: !isNaN(experimentId),
  });

  const activeFile = experiment?.files?.[0];

  // 2. Pre-run Quality Assessment
  const { data: preRunWarnings = [] } = useQuery({
    queryKey: ['preRunQuality', experimentId, activeFile?.id],
    queryFn: () => api.assessQuality({ experimentId, fileId: activeFile!.id }),
    enabled: !!activeFile,
  });

  // 3. Fetch Runs List
  const { data: runs = [] } = useQuery({
    queryKey: ['runs', experimentId],
    queryFn: () => api.listRuns(experimentId),
    enabled: !isNaN(experimentId),
  });

  useEffect(() => {
    if (runs.length > 0 && !activeRunId) {
      setActiveRunId(runs[0].id);
    }
  }, [runs, activeRunId]);

  const activeRun = runs.find((r) => r.id === activeRunId) || runs[0];
  const v1Run = runs.find((r) => r.version === 1);

  // 4. Fetch Measurements for Active Run
  const { data: serverMeasurements = [] } = useQuery({
    queryKey: ['measurements', activeRun?.id],
    queryFn: () => api.getMeasurements(activeRun!.id),
    enabled: !!activeRun,
  });

  // 5. Fetch Measurements for v1 Run
  const { data: v1Measurements = [] } = useQuery({
    queryKey: ['measurements', v1Run?.id],
    queryFn: () => api.getMeasurements(v1Run!.id),
    enabled: !!v1Run,
  });

  // 6. Fetch Reviews for this experiment
  const { data: allAssignedReviews = [] } = useQuery({
    queryKey: ['assignedReviews'],
    queryFn: () => api.listAssignedReviews(),
  });

  const activeReviewAssignment = allAssignedReviews.find(
    (a) => a.experimentId === experimentId,
  );

  // 7. Fetch Review Bundle Details (Comments & Annotations)
  const { data: reviewBundle } = useQuery({
    queryKey: ['review', activeReviewAssignment?.id],
    queryFn: () => api.getReview(activeReviewAssignment!.id),
    enabled: !!activeReviewAssignment,
  });

  // 8. Correction History & Undo/Redo Engine
  const {
    items: localMeasurements,
    deleteObject,
    addObject,
    adjustContour,
    undo,
    redo,
    reset: resetHistory,
    canUndo,
    canRedo,
    getDiff,
    hasUnsavedChanges,
    editCount,
  } = useCorrectionHistory(serverMeasurements);

  useEffect(() => {
    resetHistory(serverMeasurements);
    setSelectedObjectId(null);
  }, [serverMeasurements, resetHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  // 9. Post-run Quality Warnings
  const { data: postRunWarnings = [] } = useQuery({
    queryKey: ['postRunQuality', activeRun?.id],
    queryFn: () => api.getQuality(activeRun!.id),
    enabled: !!activeRun,
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadImage(experimentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
    },
  });

  // Run Analysis Mutation
  const runMutation = useMutation({
    mutationFn: () =>
      api.runAnalysis({
        experimentId,
        fileId: activeFile!.id,
        parameters,
      }),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: ['runs', experimentId] });
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      setActiveRunId(newRun.id);
      setSelectedObjectId(null);
    },
  });

  // Save Correction Mutation
  const saveCorrectionMutation = useMutation({
    mutationFn: (changeNote: string) => {
      const diff = getDiff();
      return api.saveCorrection({
        parentRunId: activeRun.id,
        deleteObjectIds: diff.deleteObjectIds,
        addObjects: diff.addObjects,
        adjusted: diff.adjusted,
        changeNote,
      });
    },
    onSuccess: (newVersionRun) => {
      queryClient.invalidateQueries({ queryKey: ['runs', experimentId] });
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      setActiveRunId(newVersionRun.id);
      setSelectedObjectId(null);
      setEditMode('inspect');
    },
  });

  // Send for Review Mutation
  const sendForReviewMutation = useMutation({
    mutationFn: (reviewerEmail: string) =>
      api.sendForReview({
        runId: activeRun.id,
        reviewerEmail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      queryClient.invalidateQueries({ queryKey: ['assignedReviews'] });
    },
  });

  // CSV Export Handler
  const handleExportCsv = async () => {
    if (!activeRun) return;
    const blob = await api.exportCsv(activeRun.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellscope_exp${experimentId}_v${activeRun.version}_measurements.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredMeasurements = useMemo(() => {
    return localMeasurements.filter((m) => m.area >= minAreaDisplayFilter);
  }, [localMeasurements, minAreaDisplayFilter]);

  const selectedMeasurement = useMemo(() => {
    return localMeasurements.find((m) => m.id === selectedObjectId) || null;
  }, [localMeasurements, selectedObjectId]);

  if (isLoadingExp) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading experiment..." />
      </div>
    );
  }

  if (isExpError || !experiment) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Experiment Not Found</h2>
        <p className="text-sm text-slate-600">
          {(expError as Error)?.message || 'The requested experiment could not be loaded.'}
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

  const nextVersionNumber = activeRun ? activeRun.version + 1 : 2;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="text-xs font-medium text-slate-500 hover:text-teal-700 transition flex items-center gap-1"
        >
          <span>← Back to Dashboard</span>
        </Link>

        {activeRun && (
          <div className="flex items-center gap-2">
            <Badge variant="demo">Demo result</Badge>
            <button
              type="button"
              onClick={() => setIsSendReviewOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <span>✉️ Send for Review</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <span>📥 Export CSV (v{activeRun.version})</span>
            </button>
          </div>
        )}
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {experiment.title}
              </h1>
              {experiment.isDemo && <Badge variant="demo">Demo result</Badge>}
              {experiment.reviewStatus && (
                <Badge
                  variant={
                    experiment.reviewStatus === 'approved'
                      ? 'success'
                      : experiment.reviewStatus === 'changes_requested'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  Review: {experiment.reviewStatus.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {experiment.sampleReference && (
              <p className="text-xs font-mono font-medium text-slate-500">
                Sample ID: <span className="text-slate-800 font-semibold">{experiment.sampleReference}</span>
              </p>
            )}

            {experiment.description && (
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed mt-1">
                {experiment.description}
              </p>
            )}
          </div>

          <div className="text-xs text-slate-400 sm:text-right shrink-0 space-y-1">
            <div>Created: {new Date(experiment.createdAt).toLocaleDateString()}</div>
            {activeRun && (
              <div className="text-teal-700 font-semibold flex items-center gap-1 justify-end">
                <span>Active Version:</span>
                <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                  v{activeRun.version} ({activeRun.kind})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Feedback Panel (Milestone M4) */}
      {activeReviewAssignment && reviewBundle && (
        <ReviewFeedbackPanel
          reviewAssignment={activeReviewAssignment}
          annotations={reviewBundle.annotations}
          comments={reviewBundle.comments}
        />
      )}

      {/* Upload Zone (If no files uploaded) */}
      {!activeFile ? (
        <div className="space-y-4">
          <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900">
            <strong>Microscopy Image Needed:</strong> Upload a PNG, JPEG, or TIFF specimen image to configure parameters, perform automated Otsu watershed candidate object detection, and inspect measurements.
          </div>
          <ImageUploadZone
            onUpload={async (file) => {
              await uploadMutation.mutateAsync(file);
            }}
            isUploading={uploadMutation.isPending}
          />
        </div>
      ) : (
        /* Core Slice & Correction Workspace */
        <div className="space-y-6">
          {preRunWarnings.length > 0 && (
            <QualityWarningBanner warnings={preRunWarnings} title="Pre-run Specimen Assessment" />
          )}

          {postRunWarnings.length > 0 && (
            <QualityWarningBanner warnings={postRunWarnings} title="Analysis Run Quality Warnings" />
          )}

          {/* Correction Toolbar (Milestone M3) */}
          {activeRun && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">
                  Correction Tools:
                </span>
                <button
                  type="button"
                  onClick={() => setEditMode('inspect')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    editMode === 'inspect'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  🔍 Inspect
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode('add')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    editMode === 'add'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  + Add Missed Object
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedObjectId && localMeasurements.length > 0) {
                      setSelectedObjectId(localMeasurements[0].id);
                    }
                    setEditMode('adjust');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    editMode === 'adjust'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  ✏️ Adjust Boundary
                </button>
                {selectedObjectId && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteObject(selectedObjectId);
                      setSelectedObjectId(null);
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition"
                  >
                    🗑️ Delete Selected (#{selectedObjectId})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition"
                  title="Undo (Ctrl+Z)"
                >
                  ↶ Undo
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition"
                  title="Redo (Ctrl+Y)"
                >
                  ↷ Redo
                </button>

                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-700 font-medium px-2 py-1 bg-amber-50 rounded-lg border border-amber-200 animate-pulse">
                    ● {editCount} edits unsaved
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(true)}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-40"
                >
                  Save as Version v{nextVersionNumber}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Canvas, Histogram & Table (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="font-semibold text-slate-700">
                    Microscopy Specimen Canvas ({activeFile.filename}) — Version v{activeRun ? activeRun.version : 1}
                  </span>
                  <span>{activeFile.width} × {activeFile.height} px</span>
                </div>

                <AnalysisCanvas
                  imageUrl={activeFile.originalUrl}
                  measurements={localMeasurements}
                  selectedObjectId={selectedObjectId}
                  onSelectObject={(id) => setSelectedObjectId(id)}
                  filteredMeasurements={filteredMeasurements}
                  editMode={editMode}
                  onAddObject={(contour) => addObject(contour)}
                  onAdjustContour={(id, newContour) => adjustContour(id, newContour)}
                />
              </div>

              {localMeasurements.length > 0 && (
                <SizeHistogram
                  measurements={localMeasurements}
                  minAreaFilter={minAreaDisplayFilter}
                  onMinAreaFilterChange={(val) => setMinAreaDisplayFilter(val)}
                />
              )}

              {localMeasurements.length > 0 && (
                <MeasurementsTable
                  measurements={filteredMeasurements}
                  selectedObjectId={selectedObjectId}
                  onSelectObject={(id) => setSelectedObjectId(id)}
                />
              )}
            </div>

            {/* Right Column: Version History, Parameters, Inspector (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              {runs.length > 0 && activeRun && (
                <VersionHistoryPanel
                  runs={runs}
                  activeRunId={activeRun.id}
                  onSelectRun={(runId) => {
                    setActiveRunId(runId);
                    setSelectedObjectId(null);
                    setEditMode('inspect');
                  }}
                  currentMeasurements={localMeasurements}
                  v1Measurements={v1Measurements}
                />
              )}

              <AnalysisSettingsPanel
                parameters={parameters}
                onChange={(p) => setParameters(p)}
                onRun={() => runMutation.mutate()}
                isRunning={runMutation.isPending}
              />

              {localMeasurements.length > 0 && (
                <ObjectDetailCard
                  measurement={selectedMeasurement}
                  onDeselect={() => setSelectedObjectId(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Version Modal */}
      {activeRun && (
        <SaveVersionModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          nextVersion={nextVersionNumber}
          diff={getDiff()}
          onConfirm={async (changeNote) => {
            await saveCorrectionMutation.mutateAsync(changeNote);
          }}
          isSaving={saveCorrectionMutation.isPending}
        />
      )}

      {/* Send for Review Modal */}
      {activeRun && (
        <SendForReviewModal
          isOpen={isSendReviewOpen}
          onClose={() => setIsSendReviewOpen(false)}
          runVersion={activeRun.version}
          onConfirm={async (email) => {
            await sendForReviewMutation.mutateAsync(email);
          }}
          isSending={sendForReviewMutation.isPending}
        />
      )}
    </div>
  );
}
