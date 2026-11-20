import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AnalysisParameters } from '../../types';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ImageUploadZone } from './ImageUploadZone';
import { AnalysisSettingsPanel } from '../analysis/AnalysisSettingsPanel';
import { QualityWarningBanner } from '../analysis/QualityWarningBanner';
import { AnalysisCanvas } from '../image-editor/AnalysisCanvas';
import { MeasurementsTable } from '../analysis/MeasurementsTable';
import { ObjectDetailCard } from '../analysis/ObjectDetailCard';
import { SizeHistogram } from '../analysis/SizeHistogram';

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

  // 3. Fetch Runs & Latest Run
  const { data: runs = [] } = useQuery({
    queryKey: ['runs', experimentId],
    queryFn: () => api.listRuns(experimentId),
    enabled: !isNaN(experimentId),
  });

  const latestRun = runs[0];

  // 4. Fetch Measurements for Latest Run
  const { data: measurements = [] } = useQuery({
    queryKey: ['measurements', latestRun?.id],
    queryFn: () => api.getMeasurements(latestRun!.id),
    enabled: !!latestRun,
  });

  // 5. Fetch Post-run Quality Warnings
  const { data: postRunWarnings = [] } = useQuery({
    queryKey: ['postRunQuality', latestRun?.id],
    queryFn: () => api.getQuality(latestRun!.id),
    enabled: !!latestRun,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', experimentId] });
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      setSelectedObjectId(null);
    },
  });

  // CSV Export Handler
  const handleExportCsv = async () => {
    if (!latestRun) return;
    const blob = await api.exportCsv(latestRun.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellscope_run_${latestRun.id}_measurements.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filtered measurements based on the non-mutating display filter
  const filteredMeasurements = useMemo(() => {
    return measurements.filter((m) => m.area >= minAreaDisplayFilter);
  }, [measurements, minAreaDisplayFilter]);

  const selectedMeasurement = useMemo(() => {
    return measurements.find((m) => m.id === selectedObjectId) || null;
  }, [measurements, selectedObjectId]);

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

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="text-xs font-medium text-slate-500 hover:text-teal-700 transition flex items-center gap-1"
        >
          <span>← Back to Dashboard</span>
        </Link>

        {latestRun && (
          <div className="flex items-center gap-2">
            <Badge variant="demo">Demo result</Badge>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <span>📥 Export CSV</span>
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

          <div className="text-xs text-slate-400 sm:text-right shrink-0">
            <div>Created: {new Date(experiment.createdAt).toLocaleDateString()}</div>
            {latestRun && (
              <div className="text-teal-700 font-medium mt-1">
                Latest Run: v{latestRun.version} ({latestRun.objectCount} candidate objects)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Upload Zone (If no files uploaded yet) */}
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
        /* Core Slice Workspace: Canvas + Parameters + Results */
        <div className="space-y-6">
          {/* Pre-run Quality Warnings */}
          {preRunWarnings.length > 0 && (
            <QualityWarningBanner warnings={preRunWarnings} title="Pre-run Specimen Assessment" />
          )}

          {/* Post-run Quality Warnings */}
          {postRunWarnings.length > 0 && (
            <QualityWarningBanner warnings={postRunWarnings} title="Analysis Run Quality Warnings" />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Canvas & Visualizations (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Konva Image & Detection Canvas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="font-semibold text-slate-700">
                    Microscopy Specimen Canvas ({activeFile.filename})
                  </span>
                  <span>
                    {activeFile.width} × {activeFile.height} px
                  </span>
                </div>

                <AnalysisCanvas
                  imageUrl={activeFile.originalUrl}
                  measurements={measurements}
                  selectedObjectId={selectedObjectId}
                  onSelectObject={(id) => setSelectedObjectId(id)}
                  filteredMeasurements={filteredMeasurements}
                />
              </div>

              {/* Size Distribution Histogram */}
              {measurements.length > 0 && (
                <SizeHistogram
                  measurements={measurements}
                  minAreaFilter={minAreaDisplayFilter}
                  onMinAreaFilterChange={(val) => setMinAreaDisplayFilter(val)}
                />
              )}

              {/* Measurements Table */}
              {measurements.length > 0 && (
                <MeasurementsTable
                  measurements={filteredMeasurements}
                  selectedObjectId={selectedObjectId}
                  onSelectObject={(id) => setSelectedObjectId(id)}
                />
              )}
            </div>

            {/* Right Column: Parameters Panel & Selected Object Inspector (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* Analysis Settings */}
              <AnalysisSettingsPanel
                parameters={parameters}
                onChange={(p) => setParameters(p)}
                onRun={() => runMutation.mutate()}
                isRunning={runMutation.isPending}
              />

              {/* Active Candidate Object Inspector Card */}
              {measurements.length > 0 && (
                <ObjectDetailCard
                  measurement={selectedMeasurement}
                  onDeselect={() => setSelectedObjectId(null)}
                />
              )}

              {/* Replace Image Action */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                <span className="font-semibold block text-slate-800">Upload Alternate Image</span>
                <p className="text-[11px] text-slate-400">
                  Switch the target specimen image for this experiment:
                </p>
                <ImageUploadZone
                  onUpload={async (file) => {
                    await uploadMutation.mutateAsync(file);
                  }}
                  isUploading={uploadMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
