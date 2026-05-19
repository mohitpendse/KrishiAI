import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Helmet } from 'react-helmet-async';
import { EmptyState } from '@/components/EmptyState';
import { getUserStorageKey } from '../utils/storage';
import { API_BASE_URL } from '../utils/api';

// Local UI stubs (dark themed) — replace with real components when available.
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; className?: string }> = ({ children, className = '', variant, size, ...props }) => {
  const variantClass = variant === 'outline' || variant === 'ghost' ? 'btn-outline' : variant === 'destructive' ? 'border border-red-300/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-300' : 'btn-primary';
  const sizeClass = size === 'sm' || size === 'icon' ? 'btn-sm' : 'btn-md';
  return <button {...props} className={(`btn ${variantClass} ${sizeClass} ${className}`).trim()}>{children}</button>;
};

const Dialog: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children?: React.ReactNode }> = ({ open = false, children }) => (
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10">{children}</div>
    </div>
  ) : null
);

const DialogContent: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={("home-hero-panel w-[380px] max-w-[calc(100vw-2rem)] p-6 text-white shadow-2xl " + className).trim()}>{children}</div>
);
const DialogHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => <div className="mb-2">{children}</div>;
const DialogTitle: React.FC<{ children?: React.ReactNode }> = ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>;
const DialogFooter: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={("mt-4 flex justify-end gap-2 " + className).trim()}>{children}</div>
);

const LoadingSkeleton: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '' }) => (
  <div className={("animate-pulse bg-slate-700/40 rounded " + className).trim()} style={{ minHeight: 80 }} />
);

const ErrorBoundary: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

// Small local icon stubs
const SimplePin: React.FC = () => <span aria-hidden>📍</span>;

// Types
interface Point {
  x: number;
  y: number;
}

interface Dimension {
  start: Point;
  end: Point;
  length: number;
  unit: 'meters' | 'feet';
}

interface Vector {
  start: Point;
  end: Point;
}

interface Coordinates {
  points: Point[];
  northDeg: number;
  vectors: Vector[];
  dimensions: Dimension[];
  cropHistory?: CropHistoryEntry[];
}

interface CropHistoryEntry {
  id: string;
  crop_name: string;
  season: string;
  year: string;
  yield_per_acre: number;
  notes?: string;
}

interface NewField {
  field_name: string;
  field_size: number;
  soil_type: string;
  irrigation_type: string;
  coordinates: Coordinates;
}

interface Field extends NewField {
  id: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  thumbnail?: string;
}

interface SoilReport {
  id: string;
  field_id: string;
  report_type: string;
  file_path: string | null;
  analysis_data: Record<string, any>;
  ph_level: number | null;
  moisture_content: number | null;
  nitrogen_content: number | null;
  phosphorus_content: number | null;
  potassium_content: number | null;
  organic_matter: number | null;
  created_at: string;
}

// Initial state
const initialField: NewField = {
  field_name: '',
  field_size: 0,
  soil_type: '',
  irrigation_type: '',
  coordinates: {
    points: [],
    northDeg: 0,
    vectors: [],
    dimensions: [],
    cropHistory: []
  }
};

// Helper to initialize field coordinates
const initField = (field: Omit<Field, 'coordinates'>): Field => ({
  ...field,
  coordinates: {
    points: [],
    northDeg: 0,
    vectors: [],
    dimensions: [],
    cropHistory: []
  }
});

const LandManagementPage: React.FC = () => {
  const API_BASE = API_BASE_URL;
  // For inline measurement input
  const [activeMeasure, setActiveMeasure] = useState<null | { start: Point; end: Point; mid: Point }>(null);
  const [measureValue, setMeasureValue] = useState('');
  const [measurePos, setMeasurePos] = useState<{ left: number; top: number; angle: number } | null>(null);
  const [measureModalOpen, setMeasureModalOpen] = useState(false);
  const [editingDimIndex, setEditingDimIndex] = useState<number | null>(null);
  const [measureOverlayInputEl, setMeasureOverlayInputEl] = useState<HTMLInputElement | null>(null);
  const [rafId, setRafId] = useState<number | null>(null);

  useEffect(() => {
    if (measurePos && activeMeasure && measureOverlayInputEl) {
      // focus after render
      setTimeout(() => {
        try { measureOverlayInputEl.focus(); } catch {}
      }, 50);
    }
  }, [measurePos, activeMeasure, measureOverlayInputEl]);

  // cancel any pending rAF on unmount
  useEffect(() => {
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [rafId]);
  const [measureModalInputEl, setMeasureModalInputEl] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    if (measureModalOpen && measureModalInputEl) {
      try { measureModalInputEl.focus(); } catch {}
    }
  }, [measureModalOpen, measureModalInputEl]);
  const [hoverMeasure, setHoverMeasure] = useState<null | { start: Point; end: Point; mid: Point; angle: number; displayAngle: number; length?: number; unit?: 'meters' | 'feet'; index?: number }>(null);

  // Normalize angle so pill text stays upright: keep angle within [-90,90]
  function normalizeAngle(angle: number): number {
    let a = angle;
    if (a > 90) a -= 180;
    else if (a < -90) a += 180;
    return a;
  }
  // State
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [soilReports, setSoilReports] = useState<SoilReport[]>([]);
  // Per-field soil analysis state
  const [soilAnalysisState, setSoilAnalysisState] = useState<Record<string, {
    selectedFiles: File[];
    isAnalyzing: boolean;
    analysisResult: any;
    analysisType: 'image' | 'video' | 'lab';
  }>>({});

  function getFieldSoilState(fieldId: string) {
    return soilAnalysisState[fieldId] || {
      selectedFiles: [],
      isAnalyzing: false,
      analysisResult: null,
      analysisType: 'image',
    };
  }
  function setFieldSoilState(fieldId: string, partial: Partial<{ selectedFiles: File[]; isAnalyzing: boolean; analysisResult: any; analysisType: 'image' | 'video' | 'lab'; }>) {
    const currentState = getFieldSoilState(fieldId);
    const newState = { ...currentState, ...partial };
    setSoilAnalysisState({
      ...soilAnalysisState,
      [fieldId]: newState,
    });
  }
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [newField, setNewField] = useState<NewField>(() => ({ ...initialField }));
  // Drawing customizations
  const [gridSize, setGridSize] = useState<number>(50); // spacing in viewBox units
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [drawingTool, setDrawingTool] = useState<'vector' | 'poly' | 'rect' | 'ruler'>('rect');
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [rectPreview, setRectPreview] = useState<Point | null>(null);
  const [vectorStart, setVectorStart] = useState<Point | null>(null);
  const [vectorPreview, setVectorPreview] = useState<Point | null>(null);
  const [dimensionStart, setDimensionStart] = useState<Point | null>(null);
  const [dimensionPreview, setDimensionPreview] = useState<Point | null>(null);
  const [showLengthInput, setShowLengthInput] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<'meters' | 'feet'>('meters');

  // Simple state updater functions (keeps it straightforward)
  function updateField(updates: Partial<NewField>): void {
    setNewField({ ...newField, ...updates });
  }

  function updateFieldCoordinates(updates: Partial<Coordinates>): void {
    setNewField({
      ...newField,
      coordinates: { ...newField.coordinates, ...updates },
    });
  }

  // Helper functions
  function polygonArea(points: Point[]): number {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += points[j].x * points[i].y;
      area -= points[i].x * points[j].y;
    }
    return Math.abs(area) / 2;
  }

  function getPoint(e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return snapPoint({
      x: ((e.clientX - rect.left) / rect.width) * 1000,
      y: ((e.clientY - rect.top) / rect.height) * 750
    });
  }

  // Snap a point to the grid if enabled
  function snapPoint(p: Point): Point {
    if (!snapToGrid || gridSize <= 0) return p;
    return {
      x: Math.round(p.x / gridSize) * gridSize,
      y: Math.round(p.y / gridSize) * gridSize,
    };
  }

  // Update coordinates for the selected field (used in main drawing area)
  function updateSelectedFieldCoordinates(updates: Partial<Coordinates>): void {
    if (!selectedField) return;
    // For temporary fields, update both the selectedField and the fields array entry
    if (selectedField.id.startsWith('temp-')) {
      const updatedSelected = {
        ...selectedField,
        coordinates: { ...selectedField.coordinates, ...updates }
      };
      setSelectedField(updatedSelected);
      const idx = fields.findIndex(f => f.id === selectedField.id);
      if (idx >= 0) {
        const next = fields.slice();
        next[idx] = updatedSelected;
        setFields(next);
      }
      return;
    }

    // For saved fields, update both fields array and selected field
    const next = fields.map((f) => {
      if (f.id !== selectedField.id) return f;
      return {
        ...f,
        coordinates: { ...f.coordinates, ...updates },
      };
    });
    setFields(next);
    // keep selectedField reference updated
    const updated = next.find((f) => f.id === selectedField.id) || null;
    setSelectedField(updated);
  // Persist coordinates only for backend-created fields.
  if (updated && isBackendFieldId(updated.id)) {
      (async () => {
        try {
          const token = localStorage.getItem('token');
          // Update uses the backend path /api/fields/fields/{id}
          const res = await fetch(`${API_BASE}/fields/fields/${updated.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ coordinates: updated.coordinates, field_size: updated.field_size })
          });
          if (!res.ok) {
            const txt = await res.text();
            console.warn('Failed to persist field coordinates:', txt);
          }
        } catch (err) {
          console.warn('Failed to persist field coordinates:', err);
        }
      })();
    }
  }

  function calculateAreaFrom(points: Point[], dims: Dimension[]): number {
    if (!dims?.length || !points || points.length < 3) return 0;

    const validDims = dims.filter((dim) => {
      const pixelLength = Math.hypot(dim.end.x - dim.start.x, dim.end.y - dim.start.y);
      return pixelLength >= 1 && dim.length > 0;
    });
    if (!validDims.length) return 0;

    const areaInPixels = polygonArea(points);
    if (areaInPixels < 1) return 0;

    const pixelsPerFootValues = validDims.map((dim) => {
      const pixelLength = Math.hypot(dim.end.x - dim.start.x, dim.end.y - dim.start.y);
      const lengthInFeet = dim.unit === 'meters' ? dim.length * 3.280839895 : dim.length;
      return pixelLength / lengthInFeet;
    });
    const pixelsPerFoot = pixelsPerFootValues.reduce((sum, value) => sum + value, 0) / pixelsPerFootValues.length;
    if (!pixelsPerFoot || pixelsPerFoot <= 0) return 0;

    const areaInSquareFeet = areaInPixels / (pixelsPerFoot * pixelsPerFoot);
    const SQ_M_PER_ACRE = 4046.8564224;
    const SQ_FT_PER_ACRE = 43560;

    return areaInSquareFeet / SQ_FT_PER_ACRE;
  }

  function calculateAreaForField(field: Field | NewField): number {
    return calculateAreaFrom(field.coordinates.points, field.coordinates.dimensions);
  }

  function isBackendFieldId(fieldId: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fieldId);
  }

  function formatArea(acres: number): string {
    if (!acres || acres <= 0) return '0 acres';
    if (acres < 0.01) return `${(acres * 43560).toFixed(1)} sq ft`;
    if (acres < 1) return `${acres.toFixed(3)} acres`;
    return `${acres.toFixed(2)} acres`;
  }

  function previewAreaForActiveMeasure(): number {
    if (!selectedField || !activeMeasure || !measureValue) return 0;
    const length = parseFloat(measureValue);
    if (!length || length <= 0) return 0;
    const dim: Dimension = {
      start: activeMeasure.start,
      end: activeMeasure.end,
      length,
      unit: measurementUnit,
    };
    const dims = [...(selectedField.coordinates.dimensions || [])];
    if (typeof editingDimIndex === 'number' && editingDimIndex >= 0 && editingDimIndex < dims.length) {
      dims[editingDimIndex] = dim;
    } else {
      dims.push(dim);
    }
    return calculateAreaFrom(selectedField.coordinates.points, dims);
  }

  function addCropHistoryEntry(entry: Omit<CropHistoryEntry, 'id'>): void {
    if (!selectedField || !entry.crop_name.trim()) return;
    const nextHistory = [
      ...(selectedField.coordinates.cropHistory || []),
      { ...entry, id: Math.random().toString(36).slice(2, 11) },
    ];
    updateSelectedFieldCoordinates({ cropHistory: nextHistory });
  }

  function deleteCropHistoryEntry(id: string): void {
    if (!selectedField) return;
    updateSelectedFieldCoordinates({
      cropHistory: (selectedField.coordinates.cropHistory || []).filter((entry) => entry.id !== id),
    });
  }

  // Add or edit a dimension and immediately refresh calculated field size.
  function addDimension(start: Point, end: Point, length: number, index?: number | null): void {
    if (!length || length <= 0 || !selectedField) return;

    const nextDims = [...(selectedField.coordinates.dimensions || [])];
    const dim: Dimension = { start, end, length, unit: measurementUnit };
    if (typeof index === 'number' && index >= 0 && index < nextDims.length) nextDims[index] = dim;
    else nextDims.push(dim);

    const updatedField: Field = {
      ...selectedField,
      coordinates: { ...selectedField.coordinates, dimensions: nextDims },
      field_size: calculateAreaFrom(selectedField.coordinates.points, nextDims),
    };

    setSelectedField(updatedField);
    setFields(fields.map((field) => field.id === updatedField.id ? updatedField : field));
    setEditingDimIndex(null);

    if (isBackendFieldId(updatedField.id)) {
      (async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${API_BASE}/fields/fields/${updatedField.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ coordinates: updatedField.coordinates, field_size: updatedField.field_size })
          });
        } catch (err) {
          console.warn('Failed to persist field measurement:', err);
        }
      })();
    }
  }

  // Calculate field area based on dimensions
  function calculateArea(): number {
    if (selectedField) return calculateAreaForField(selectedField);
    return calculateAreaForField(newField);
  }

  // Local persistence key
  const LOCAL_STORAGE_KEY = 'krishi_fields_v1';

  // Save fields to localStorage (simple, synchronous)
  function saveFieldsToLocal(flds: Field[]) {
    try {
      localStorage.setItem(getUserStorageKey(LOCAL_STORAGE_KEY), JSON.stringify(flds));
      window.dispatchEvent(new CustomEvent('krishiai:data-updated', { detail: { source: 'fields' } }));
    } catch (e) {
      console.warn('Failed to save fields to localStorage', e);
    }
  }

  // Load fields from localStorage
  function loadFieldsFromLocal(): Field[] | null {
    try {
      const raw = localStorage.getItem(getUserStorageKey(LOCAL_STORAGE_KEY));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Field[];
      return parsed;
    } catch (e) {
      console.warn('Failed to read fields from localStorage', e);
      return null;
    }
  }

  // Persist to localStorage whenever fields change
  useEffect(() => {
    saveFieldsToLocal(fields);
  }, [fields]);

  // Data fetching
  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        // Fetch fields from backend API
        const token = localStorage.getItem('token');
        // Backend mounts fields router under /api/fields and the router defines /fields,
        // so the full endpoint for listing fields is /api/fields/fields
        const res = await fetch(`${API_BASE}/fields/fields`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to fetch fields');
        }
        if (!contentType.includes('application/json')) {
          const txt = await res.text();
          throw new Error('Expected JSON from API but received HTML or other content: ' + txt.slice(0, 200));
        }
        const data = await res.json();
        setFields(data as Field[]);
        // also persist fetched server fields locally so user can keep offline copy
        try { saveFieldsToLocal(data as Field[]); } catch {}
        // select first field if any
        if (data && data.length > 0) setSelectedField(data[0]);
      } catch (err) {
        // If backend is not available, try to load locally persisted fields first
        console.warn('fetchFields failed, trying local storage fallback:', err);
        const local = loadFieldsFromLocal();
        if (local && local.length > 0) {
          setFields(local);
          setSelectedField(local[0]);
          setError(null);
        } else {
          setFields([]);
          setSelectedField(null);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, []);

  useEffect(() => {
    const fetchSoilReports = async () => {
      if (!selectedField) {
        setSoilReports([]);
        return;
      }

      try {
        // TODO: Replace with actual API call
        const mockReports: SoilReport[] = [{
          id: '1',
          field_id: selectedField.id,
          report_type: 'basic',
          file_path: null,
          analysis_data: {},
          ph_level: 6.5,
          moisture_content: 35,
          nitrogen_content: 100,
          phosphorus_content: 30,
          potassium_content: 200,
          organic_matter: 3,
          created_at: new Date().toISOString()
        }];
        setSoilReports(mockReports);
      } catch (err) {
        console.error('Failed to fetch soil reports:', err);
        setSoilReports([]);
      }
    };

    fetchSoilReports();
  }, [selectedField]);

  // Event handlers
  async function handleAddField(): Promise<void> {
    try {
      if (!newField.field_name.trim()) {
        throw new Error('Field name is required');
      }

      // Save the field immediately (drawing can be done later)
      // create a temporary field so the user can draw boundaries and then "Finish Drawing"
      const tempId = `temp-${Math.random().toString(36).slice(2, 11)}`;
      const saved: Field = {
        id: tempId,
        field_name: newField.field_name,
        field_size: newField.field_size || 0,
        irrigation_type: newField.irrigation_type || '',
        soil_type: '',
        coordinates: {
          points: [],
          northDeg: 0,
          vectors: [],
          dimensions: []
        }
      };

      // Add to saved fields and select it so user can draw later
      const nextFields = [...fields, saved];
      setFields(nextFields);
      setSelectedField(saved);
      setShowAddFieldDialog(false);
      setNewField({ ...initialField });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add field';
      console.error('Failed to add field:', err);
      alert(errorMessage);
    }
  }

  async function handleDeleteField(fieldId: string): Promise<void> {
    if (!window.confirm('Are you sure you want to delete this field?')) return;

    try {
      if (isBackendFieldId(fieldId)) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/fields/fields/${fieldId}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to delete field on server');
        }
      }
      const next: Field[] = fields.filter((f: Field) => f.id !== fieldId);
      setFields(next);
      if (selectedField?.id === fieldId) {
        setSelectedField(next[0] || null);
      }
    } catch (err) {
      console.error('Failed to delete field:', err);
      alert('Failed to delete field. Please try again.');
    }
  }

  async function handleSoilSampleUpload(event: React.ChangeEvent<HTMLInputElement>, fieldId: string): Promise<void> {
    if (!event.target.files?.length) return;

    try {
      // TODO: Replace with actual API call
      const mockReport: SoilReport = {
        id: Math.random().toString(36).slice(2, 11),
        field_id: fieldId,
        report_type: 'lab_analysis',
        file_path: null,
        analysis_data: {},
        ph_level: Math.random() * 4 + 4,
        moisture_content: Math.random() * 50 + 20,
        nitrogen_content: Math.random() * 150 + 50,
        phosphorus_content: Math.random() * 60 + 10,
        potassium_content: Math.random() * 300 + 100,
        organic_matter: Math.random() * 5 + 1,
        created_at: new Date().toISOString(),
      };

      const next: SoilReport[] = [...soilReports, mockReport];
      setSoilReports(next);
    } catch (err) {
      console.error('Failed to upload soil sample:', err);
      alert('Failed to upload soil sample. Please try again.');
    }
  }

  // Render helper functions
  const renderFieldDrawing = () => (
    <div className="app-panel col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Field Drawing</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/10 bg-slate-950/80 p-1 gap-1">
            <button
              className={`p-1.5 rounded ${drawingTool === 'rect' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-700'}`}
              onClick={() => setDrawingTool('rect')}
              title="Draw rectangle"
            >
              <span aria-hidden>⬜</span>
            </button>
            <button
              className={`p-1.5 rounded ${drawingTool === 'vector' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-700'}`}
              onClick={() => setDrawingTool('vector')}
              title="Draw vector"
            >
              <span aria-hidden>➡️</span>
            </button>
            <button
              className={`p-1.5 rounded ${drawingTool === 'poly' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-700'}`}
              onClick={() => setDrawingTool('poly')}
              title="Draw polygon"
            >
              <span aria-hidden>🔷</span>
            </button>
            <button
              className={`p-1.5 rounded ${drawingTool === 'ruler' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-700'}`}
              onClick={() => setDrawingTool('ruler')}
              title="Ruler"
            >
              <span aria-hidden>📏</span>
            </button>
          </div>
          <div className="hidden xl:block max-w-xs text-xs text-muted-foreground">
            {drawingTool === 'vector' && '➡️ Click and drag to draw a vector line'}
            {drawingTool === 'poly' && '🔷 Click to add points, form a closed polygon'}
            {drawingTool === 'rect' && '⬜ Drag to draw rectangle boundary (minimum 3 points)'}
            {drawingTool === 'ruler' && '📏 Click and drag to measure distance, then enter the real-world measurement (meters/feet)'}
          </div>

          <div className="ml-4 flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Grid</label>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="input h-8 w-20"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <label className="ml-3 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
              Snap to Grid
            </label>
          </div>

          {selectedField && (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  updateSelectedFieldCoordinates({
                    points: [],
                    vectors: [],
                    dimensions: []
                  });
                }}
              >
                Clear All
              </Button>
              {selectedField.id.startsWith('temp-') && selectedField.coordinates.points.length >= 3 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    // Validation checks
                    if (!selectedField.coordinates.points || selectedField.coordinates.points.length < 3) {
                      alert('Please draw a complete field boundary (at least 3 points).');
                      return;
                    }
                    
                    if (selectedField.coordinates.dimensions.length === 0) {
                      alert('Please add at least one dimension measurement to establish the scale.');
                      return;
                    }
                    
                    // Validate dimension - must have non-zero pixel length and valid measurement value
                    const firstDim = selectedField.coordinates.dimensions[0];
                    const dx = firstDim.end.x - firstDim.start.x;
                    const dy = firstDim.end.y - firstDim.start.y;
                    const pixelLength = Math.sqrt(dx * dx + dy * dy);
                    
                    if (pixelLength === 0) {
                      alert('Dimension line appears to have zero length. Please draw a proper measurement line.');
                      return;
                    }
                    
                    if (firstDim.length <= 0) {
                      alert('Dimension value must be greater than 0.');
                      return;
                    }
                    
                    // Calculate area from dimensions
                    const area = calculateArea();
                    if (area <= 0) {
                      alert('Invalid area calculation. Please verify your field boundary and dimension measurements.');
                      return;
                    }

                    // Create the final field - persist to backend
                    try {
                      const token = localStorage.getItem('token');
                      const payload = {
                        field_name: selectedField.field_name,
                        field_size: area,
                        coordinates: selectedField.coordinates,
                        soil_type: selectedField.soil_type,
                        irrigation_type: selectedField.irrigation_type
                      };

                      // Backend expects POST to /api/fields/fields
                      const res = await fetch(`${API_BASE}/fields/fields`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(payload)
                      });

                      const contentType = res.headers.get('content-type') || '';
                      if (!res.ok) {
                        const txt = await res.text();
                        throw new Error(txt || 'Failed to create field');
                      }
                      if (!contentType.includes('application/json')) {
                        const txt = await res.text();
                        throw new Error('Expected JSON from server but got: ' + txt.slice(0,200));
                      }

                      const created = await res.json();
                      // Replace temp with server-created field
                      const idx = fields.findIndex(f => f.id === selectedField.id);
                      if (idx >= 0) {
                        const next = fields.slice();
                        next[idx] = created as Field;
                        setFields(next);
                      } else {
                        setFields([...fields, created as Field]);
                      }
                      setSelectedField(created as Field);
                    } catch (err) {
                      console.error('Failed to create field on server, saving locally:', err);
                      alert('Field saved locally because the backend rejected it. Restart backend and finish/save again before uploading soil files.');
                      const finalFieldId = `local-${Math.random().toString(36).slice(2, 11)}`;
                      const finalField: Field = { ...selectedField, id: finalFieldId, field_size: area };
                      const idx = fields.findIndex(f => f.id === selectedField.id);
                      if (idx >= 0) {
                        const next = fields.slice();
                        next[idx] = finalField;
                        setFields(next);
                      } else {
                        setFields([...fields, finalField]);
                      }
                      setSelectedField(finalField);
                    } finally {
                      setNewField({ ...initialField }); // Reset new field form
                    }
                  }}
                >
                  Finish Drawing
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-emerald-500/15 bg-slate-950 shadow-inner">
        <svg
          viewBox="0 0 1000 750"
          className="w-full h-full cursor-crosshair"
          onClick={(e: React.MouseEvent<SVGSVGElement>) => {
            if (!selectedField || drawingTool !== 'poly') return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 1000;
            const y = ((e.clientY - rect.top) / rect.height) * 750;
            const p = snapPoint({ x, y });
            updateSelectedFieldCoordinates({ points: [...selectedField.coordinates.points, p] });
          }}
          onPointerDown={(e: React.PointerEvent<SVGSVGElement>) => {
            if (!selectedField) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 1000;
            const y = ((e.clientY - rect.top) / rect.height) * 750;
            const p = snapPoint({ x, y });

            if (drawingTool === 'vector') {
              setVectorStart(p);
              setVectorPreview(p);
            } else if (drawingTool === 'rect') {
              setRectStart(p);
              setRectPreview(p);
            } else if (drawingTool === 'ruler') {
              setDimensionStart(p);
              setDimensionPreview(p);
            } else if (drawingTool === 'poly') {
              updateSelectedFieldCoordinates({ points: [...selectedField.coordinates.points, p] });
            }
            // capture pointer so we receive move/up events
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
          }}
          onPointerMove={(e: React.PointerEvent<SVGSVGElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 1000;
            const y = ((e.clientY - rect.top) / rect.height) * 750;
            const p = snapPoint({ x, y });

            if (vectorStart) {
              setVectorPreview(p);
            } else if (rectStart) {
              setRectPreview(p);
            } else if (dimensionStart) {
              setDimensionPreview(p);
            }
          }}
          onPointerUp={(e: React.PointerEvent<SVGSVGElement>) => {
            if (!selectedField) {
              setVectorStart(null);
              setVectorPreview(null);
              setRectStart(null);
              setRectPreview(null);
              setDimensionStart(null);
              setDimensionPreview(null);
              return;
            }

            if (vectorStart && vectorPreview) {
              // add vector to field
              updateSelectedFieldCoordinates({
                vectors: [...(selectedField.coordinates.vectors || []), { start: vectorStart, end: vectorPreview }]
              });
              setVectorStart(null);
              setVectorPreview(null);
            } else if (rectStart && rectPreview) {
              // add rectangle points
              const x1 = Math.min(rectStart.x, rectPreview.x);
              const x2 = Math.max(rectStart.x, rectPreview.x);
              const y1 = Math.min(rectStart.y, rectPreview.y);
              const y2 = Math.max(rectStart.y, rectPreview.y);
              const rectPoints: Point[] = [
                { x: x1, y: y1 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: x1, y: y2 },
              ];
              updateSelectedFieldCoordinates({ points: [...selectedField.coordinates.points, ...rectPoints] });
              setRectStart(null);
              setRectPreview(null);
            } else if (dimensionStart && dimensionPreview) {
              // Only show measurement input when a real segment was drawn (avoid single-click noise)
              const distance = Math.hypot(dimensionPreview.x - dimensionStart.x, dimensionPreview.y - dimensionStart.y);
              if (distance > 4) {
                setMeasureValue('');
                const mid = { x: (dimensionStart.x + dimensionPreview.x) / 2, y: (dimensionStart.y + dimensionPreview.y) / 2 };
                const angle = Math.atan2(dimensionPreview.y - dimensionStart.y, dimensionPreview.x - dimensionStart.x) * (180 / Math.PI);
                setMeasurePos({ left: mid.x, top: mid.y, angle: normalizeAngle(angle) });
                setActiveMeasure({ start: dimensionStart, end: dimensionPreview, mid });
              }
              setDimensionStart(null);
              setDimensionPreview(null);
            }
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
          }}
        >
          {/* Grid Pattern */}
          <defs>
            {/* Minor grid pattern - very subtle lines */}
            <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <rect width={gridSize} height={gridSize} fill="none" stroke="rgba(71, 85, 105, 0.15)" strokeWidth="0.5" />
            </pattern>
            {/* Major grid pattern - visible lines every 5 units */}
            <pattern id="majorGrid" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
              <rect width={gridSize * 5} height={gridSize * 5} fill="none" stroke="rgba(100, 116, 139, 0.25)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="750" fill="rgb(15, 23, 42)" />

          {/* Major grid overlay */}
          <rect width="1000" height="750" fill="url(#majorGrid)" />
          
          {/* Minor grid overlay (optional, very subtle) */}
          <rect width="1000" height="750" fill="url(#grid)" style={{ opacity: 0.5 }} />

          {/* Polygon (only selected field) */}
          {selectedField && selectedField.coordinates.points.length > 0 && (
            <polygon
              points={selectedField.coordinates.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="rgba(59, 130, 246, 0.25)"
              stroke="rgb(96, 165, 250)"
              strokeWidth="2"
              style={{ transition: 'all 160ms cubic-bezier(.2,.9,.2,1)' }}
            />
          )}

          {/* Vectors */}
          {selectedField && selectedField.coordinates.vectors.map((v, i) => (
            <line key={i} x1={v.start.x} y1={v.start.y} x2={v.end.x} y2={v.end.y} stroke="rgb(34, 197, 94)" strokeWidth="2" />
          ))}

          {/* Points */}
          {selectedField && selectedField.coordinates.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="5" fill="rgb(96, 165, 250)" style={{ transition: 'all 160ms ease' }} />
          ))}

          {/* Preview line (while drawing) */}
          {rectPreview && rectStart && (
            <>
              <rect x={Math.min(rectStart.x, rectPreview.x)} y={Math.min(rectStart.y, rectPreview.y)} width={Math.abs(rectPreview.x - rectStart.x)} height={Math.abs(rectPreview.y - rectStart.y)} fill="rgba(139, 92, 246, 0.15)" stroke="rgb(168, 85, 247)" strokeWidth="2.5" strokeDasharray="5,5" />
            </>
          )}

          {vectorPreview && vectorStart && (
            <line x1={vectorStart.x} y1={vectorStart.y} x2={vectorPreview.x} y2={vectorPreview.y} stroke="rgb(168, 85, 247)" strokeWidth="2.5" strokeDasharray="5,5" />
          )}

          {/* Dimension preview (ruler tool) - highlight it better */}
          {dimensionPreview && dimensionStart && (
            <>
              <line x1={dimensionStart.x} y1={dimensionStart.y} x2={dimensionPreview.x} y2={dimensionPreview.y} stroke="rgb(251, 191, 36)" strokeWidth="3" strokeDasharray="6,4" style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.6))' }} />
              {/* Show measurement line length in real-time */}
              <circle cx={dimensionStart.x} cy={dimensionStart.y} r="6" fill="rgb(251, 191, 36)" opacity="0.7" />
              <circle cx={dimensionPreview.x} cy={dimensionPreview.y} r="6" fill="rgb(251, 191, 36)" opacity="0.7" />
            </>
          )}

          {/* Dimensions with labels */}
          {selectedField && selectedField.coordinates.dimensions.map((dim, i) => {
            const mid = { x: (dim.start.x + dim.end.x) / 2, y: (dim.start.y + dim.end.y) / 2 };
            const angle = Math.atan2(dim.end.y - dim.start.y, dim.end.x - dim.start.x) * (180 / Math.PI);
            const displayAngle = normalizeAngle(angle);
            const isHovered = hoverMeasure?.index === i;
            return (
              <g key={i}>
                {/* Thick transparent line for easier hovering */}
                <line
                  x1={dim.start.x}
                  y1={dim.start.y}
                  x2={dim.end.x}
                  y2={dim.end.y}
                  stroke="transparent"
                  strokeWidth="16"
                  pointerEvents="auto"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverMeasure({ ...dim, mid, angle, displayAngle, index: i })}
                  onMouseLeave={() => setHoverMeasure(null)}
                  onClick={() => {
                    setEditingDimIndex(i);
                    setMeasureValue(dim.length.toString());
                    setMeasurementUnit(dim.unit);
                    setMeasurePos({ left: mid.x, top: mid.y, angle: displayAngle });
                    setActiveMeasure({ start: dim.start, end: dim.end, mid });
                  }}
                />
                {/* Actual visible line */}
                <line
                  x1={dim.start.x}
                  y1={dim.start.y}
                  x2={dim.end.x}
                  y2={dim.end.y}
                  stroke={isHovered ? 'rgb(255, 200, 0)' : 'rgb(251, 191, 36)'}
                  strokeWidth={isHovered ? 6 : 4}
                  style={{
                    pointerEvents: 'none',
                    filter: isHovered ? 'drop-shadow(0 4px 12px rgba(255,200,0,0.6))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                    transition: 'all 80ms ease'
                  }}
                />
                <circle cx={dim.start.x} cy={dim.start.y} r="4" fill="rgb(251, 191, 36)" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                <circle cx={dim.end.x} cy={dim.end.y} r="4" fill="rgb(251, 191, 36)" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                {/* Displayed pill is pointerEvents:none so hovering the pill doesn't change hover state */}
                <g
                  transform={`translate(${mid.x} ${mid.y}) rotate(${displayAngle})`}
                  style={{ pointerEvents: 'none' }}
                >
                  <rect x="-50" y="-13" width="100" height="26" fill="rgb(30, 41, 59)" rx="7" ry="7" style={{ transition: 'all 160ms ease', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="rgb(251, 191, 36)" fontSize="12" fontWeight="700" style={{ pointerEvents: 'none' }}>
                    {dim.length} {dim.unit === 'meters' ? 'm' : 'ft'}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Measurement input pill, anchored in SVG coordinates so it stays on the line */}
          {measurePos && activeMeasure && (
            <g transform={`translate(${measurePos.left} ${measurePos.top}) rotate(${measurePos.angle})`}>
              <foreignObject x="-82" y="-17" width="164" height="52" style={{ overflow: 'visible' }}>
                <div className="flex h-[34px] items-center gap-1 rounded-full border-2 border-amber-400 bg-slate-950/95 px-2 shadow-lg shadow-black/30">
                  <input
                    type="number"
                    ref={(el) => setMeasureOverlayInputEl(el)}
                    value={measureValue}
                    onChange={e => setMeasureValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && measureValue) {
                        addDimension(activeMeasure.start, activeMeasure.end, parseFloat(measureValue), editingDimIndex);
                        setActiveMeasure(null);
                        setMeasureValue('');
                        setMeasurePos(null);
                      } else if (e.key === 'Escape') {
                        setActiveMeasure(null);
                        setMeasureValue('');
                        setMeasurePos(null);
                        setEditingDimIndex(null);
                      }
                    }}
                    autoFocus
                    className="h-7 min-w-0 flex-1 rounded-full border-0 bg-transparent px-2 text-center text-sm font-semibold text-white outline-none"
                    placeholder="Length"
                  />
                  <select
                    value={measurementUnit}
                    onChange={(e) => setMeasurementUnit(e.target.value as 'meters' | 'feet')}
                    className="h-7 rounded-full border-0 bg-amber-400 px-1 text-xs font-bold text-slate-950 outline-none"
                  >
                    <option value="meters">m</option>
                    <option value="feet">ft</option>
                  </select>
                </div>
                {previewAreaForActiveMeasure() > 0 && (
                  <div className="mt-1 text-center text-[10px] font-semibold text-amber-200">
                    Area: {formatArea(previewAreaForActiveMeasure())}
                  </div>
                )}
              </foreignObject>
            </g>
          )}
        </svg>
      </div>
    </div>
  );

  const renderFieldList = () => (
    <div className="app-panel">
      <h2 className="text-xl font-semibold mb-4">Your Fields</h2>
      {fields.length === 0 ? (
        <EmptyState
          icon={SimplePin}
          title="No Fields Added"
          description="Add your first field to start managing your land"
          actionLabel="Add Field"
          onAction={() => setShowAddFieldDialog(true)}
        />
      ) : (
        <div className="space-y-4">
          {fields.map(field => (
            <div
              key={field.id}
              className={`rounded-lg border p-4 cursor-pointer transition-all ${
                selectedField?.id === field.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/60 hover:border-primary/30 hover:bg-emerald-500/5'
              }`}
              onClick={() => setSelectedField(field)}
            >
              <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">{field.field_name}</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {formatArea(calculateAreaForField(field) || field.field_size)}
                    </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/90"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleDeleteField(field.id);
                  }}
                >
                  <span aria-hidden>🗑️</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFieldDetails = () => {
    if (!selectedField) {
      return <div className="app-panel"><p className="text-muted-foreground">Select a field to view details</p></div>;
    }
    const fieldId = selectedField.id;
    const { selectedFiles, isAnalyzing, analysisResult, analysisType } = getFieldSoilState(fieldId);
    
    function removeFile(index: number) {
      setFieldSoilState(fieldId, { selectedFiles: selectedFiles.filter((_file, i) => i !== index) });
    }
    function handleAnalyze() {
      if (selectedFiles.length === 0) return;
      if (!isBackendFieldId(fieldId)) {
        alert('Finish drawing and save the field before uploading soil files.');
        return;
      }
      const currentField = selectedField as Field;
      setFieldSoilState(fieldId, { isAnalyzing: true });

      const endpoint =
        analysisType === 'image'
          ? 'upload-image'
          : analysisType === 'video'
            ? 'upload-video'
            : 'upload-lab-report';

      Promise.all(selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('field_id', fieldId);
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/soil/${endpoint}`, {
          method: 'POST',
          headers: {
            ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
          },
          body: formData,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Failed to upload soil file');
        }

        return response.json();
      }))
        .then((results) => {
          const latest = results[results.length - 1];
          const analysis = latest?.analysis_result || {};
          setSoilReports([
            ...soilReports,
            ...results.map((result) => ({
              id: result.soil_report_id,
              field_id: fieldId,
              report_type: analysisType,
              file_path: null,
              analysis_data: result.analysis_result || {},
              ph_level: result.analysis_result?.ph_level ?? null,
              moisture_content: result.analysis_result?.moisture_content ?? null,
              nitrogen_content: result.analysis_result?.nitrogen_content ?? null,
              phosphorus_content: result.analysis_result?.phosphorus_content ?? null,
              potassium_content: result.analysis_result?.potassium_content ?? null,
              organic_matter: result.analysis_result?.organic_matter ?? null,
              created_at: new Date().toISOString(),
            })),
          ]);

          if (analysis.soil_type) {
            const updatedField: Field = { ...currentField, soil_type: analysis.soil_type };
            setSelectedField(updatedField);
            setFields(fields.map((field) => field.id === fieldId ? updatedField : field));
          }

          setFieldSoilState(fieldId, {
            analysisResult: {
              soilType: analysis.soil_type || 'From uploaded report',
              pH: analysis.ph_level ?? '-',
              moisture: analysis.moisture_content ?? '-',
              nitrogen: analysis.nitrogen_content ?? '-',
              phosphorus: analysis.phosphorus_content ?? '-',
              potassium: analysis.potassium_content ?? '-',
              organicMatter: analysis.organic_matter ?? '-',
              recommendations: [
                'Soil file uploaded and linked to this field.',
                'Crop recommendations will use this report.',
              ],
            },
            isAnalyzing: false,
          });
        })
        .catch((err) => {
          console.error('Soil upload failed:', err);
          alert('Failed to upload soil files. Please try again.');
          setFieldSoilState(fieldId, { isAnalyzing: false });
        });
      /*
      setTimeout(() => {
        setFieldSoilState(fieldId, {
          analysisResult: {
            soilType: 'Clay Loam',
            pH: 6.8,
            moisture: 45.2,
            nitrogen: 0.15,
            phosphorus: 0.12,
            potassium: 0.18,
            organicMatter: 2.5,
            recommendations: [
              '🌱 Soil pH is optimal for most crops',
              '🪱 Consider adding organic compost to improve fertility',
              '💧 Moisture content is adequate',
            ],
          },
          isAnalyzing: false,
        });
      }, 2000);
      */
    }
    return (
      <div className="app-panel">
        <h2 className="text-xl font-semibold mb-4">Field Details</h2>
        <div className="mb-6">
          <h3 className="font-medium mb-2 text-slate-900 dark:text-slate-100">{selectedField.field_name}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Size</p>
              <p className="text-slate-700 dark:text-slate-300">{(() => {
                const areaAcres = calculateArea();
                if (areaAcres && areaAcres > 0) return formatArea(areaAcres);
                return formatArea(selectedField.field_size);
              })()}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Soil Type</p>
              <p className="text-slate-700 dark:text-slate-300">{selectedField.soil_type ? selectedField.soil_type : 'From lab report'}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Irrigation</p>
              <p className="text-slate-700 dark:text-slate-300">{selectedField.irrigation_type || 'Not specified'}</p>
            </div>
          </div>
        </div>
        <CropHistoryEditor
          history={selectedField.coordinates.cropHistory || []}
          onAdd={addCropHistoryEntry}
          onDelete={deleteCropHistoryEntry}
        />
        {/* Soil Analysis Section (SoilAnalysisPage parity, with emojis/icons) */}
        <div className="mt-8">
          <h3 className="font-medium mb-2">Soil Analysis</h3>
          {isAnalyzing ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Analyzing your soil sample...</h3>
              <p className="text-muted-foreground">This may take a few moments</p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
                <button
                  onClick={() => setFieldSoilState(fieldId, { analysisResult: null, selectedFiles: [] })}
                  className="btn btn-outline btn-sm"
                >
                  New Analysis
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card">
                  <h3 className="text-lg font-semibold mb-4">Soil Properties</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Soil Type</span>
                      <span className="font-semibold">{analysisResult.soilType}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">pH Level</span>
                      <span className="font-semibold">{analysisResult.pH}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Moisture Content</span>
                      <span className="font-semibold">{analysisResult.moisture}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Nitrogen (N)</span>
                      <span className="font-semibold">{analysisResult.nitrogen}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Phosphorus (P)</span>
                      <span className="font-semibold">{analysisResult.phosphorus}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Potassium (K)</span>
                      <span className="font-semibold">{analysisResult.potassium}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Organic Matter</span>
                      <span className="font-semibold">{analysisResult.organicMatter}%</span>
                    </div>
                  </div>
                </div>
                <div className="glass-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <span className="inline-block w-5 h-5 bg-green-500 rounded-full mr-2">✅</span>
                    Recommendations
                  </h3>
                  <div className="space-y-3">
                    {analysisResult.recommendations.map((rec: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 glass rounded-lg border border-green-500/20"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <p className="text-sm text-muted-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Analysis Type Selection */}
              <div className="app-panel mb-4">
                <h2 className="text-lg font-semibold mb-4">Select Analysis Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { type: 'image', emoji: '🖼️', label: 'Image Analysis', desc: 'Upload soil photos' },
                    { type: 'video', emoji: '🎥', label: 'Video Analysis', desc: 'Upload soil videos' },
                    { type: 'lab', emoji: '📄', label: 'Lab Report', desc: 'Upload lab reports (PDF)' },
                  ].map(({ type, emoji, label, desc }) => (
                    <button
                      key={type}
                      onClick={() => setFieldSoilState(fieldId, { analysisType: type as any })}
                      className={`app-panel-compact text-left transition-all duration-300 ${
                        analysisType === type
                          ? 'border-primary/50 bg-primary/10'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <span className="inline-block w-8 h-8 mb-2 rounded-full text-2xl flex items-center justify-center">{emoji}</span>
                      <h3 className="font-semibold mb-1">{label}</h3>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              {/* File Upload */}
              <div className="app-panel">
                <h2 className="text-lg font-semibold mb-4">Upload Files</h2>
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 p-12 text-center transition-all duration-300 hover:border-primary/50">
                  <span className="inline-block h-12 w-12 mb-4 text-3xl">{analysisType === 'image' ? '🖼️' : analysisType === 'video' ? '🎥' : '📄'}</span>
                  <p className="text-muted-foreground mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports images, videos, and PDF files
                  </p>
                  <input 
                    type="file" 
                    multiple 
                    accept={analysisType === 'image' ? 'image/*' : analysisType === 'video' ? 'video/*' : 'application/pdf'}
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setFieldSoilState(fieldId, { selectedFiles: [...selectedFiles, ...newFiles] });
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="app-panel-compact flex items-center justify-between"
                      >
                        <span className="inline-block w-5 h-5 text-2xl mr-2">{file.type.startsWith('image/') ? '🖼️' : file.type.startsWith('video/') ? '🎥' : '📄'}</span>
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button
                          onClick={() => {
                            const newFiles = selectedFiles.filter((_file, i) => i !== index);
                            setFieldSoilState(fieldId, { selectedFiles: newFiles });
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors ml-2"
                          aria-label="Remove file"
                        >
                          <span className="inline-block w-4 h-4 text-lg">❌</span>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAnalyze}
                      className="btn btn-primary btn-md w-full mt-4"
                    >
                      Analyze Soil
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <ErrorBoundary>
      <div className="app-page">
        <Helmet>
          <title>Land Management - KrishiAI</title>
        </Helmet>

        <div>
          <div className="app-page-header mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="app-page-eyebrow">
                  <span aria-hidden>📍</span>
                  Field mapping
                </div>
                <h1 className="app-page-title">Land Management</h1>
                <p className="app-page-subtitle">Draw field boundaries, measure area, upload soil files, and keep your farm records organized.</p>
              </div>
              <Button onClick={() => setShowAddFieldDialog(true)} className="btn-lg shadow-lg shadow-primary/30">
                Add Field
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSkeleton />
            </div>
          ) : error ? (
            <div className="app-panel border-red-500/25 bg-red-500/10">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden>⚠️</span>
                <p className="text-red-600 dark:text-red-400">{error}</p>
             </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderFieldList()}
                {renderFieldDrawing()}
              </div>
              {renderFieldDetails()}
            </div>
          )}

          <Dialog 
            open={showAddFieldDialog} 
            onOpenChange={setShowAddFieldDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Field</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={newField.field_name}
                    onChange={(e) => updateField({ field_name: e.target.value })}
                    className="input"
                    placeholder="Enter field name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Irrigation Type
                  </label>
                  <select
                    value={newField.irrigation_type}
                    onChange={(e) => updateField({ irrigation_type: e.target.value })}
                    className="input"
                  >
                    <option value="">Select irrigation type</option>
                    <option value="drip">Drip</option>
                    <option value="sprinkler">Sprinkler</option>
                    <option value="flood">Flood</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddFieldDialog(false);
                    setNewField({ ...initialField });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!newField.field_name.trim()) {
                      alert('Please enter a field name');
                      return;
                    }
                    // Save now; user can draw the boundary later
                    handleAddField();
                  }}
                  disabled={!newField.field_name}
                >
                  Save Field
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Measurement modal fallback (appears if inline overlay fails or for clear UX) */}
          <Dialog open={measureModalOpen} onOpenChange={setMeasureModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enter Measurement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <input
                    ref={(el) => setMeasureModalInputEl(el)}
                    type="number"
                    value={measureValue}
                    onChange={(e) => setMeasureValue(e.target.value)}
                    onKeyDown={(e) => {
            if (e.key === 'Enter' && activeMeasure && measureValue) {
              addDimension(activeMeasure.start, activeMeasure.end, parseFloat(measureValue), editingDimIndex);
                        setMeasureModalOpen(false);
                        setActiveMeasure(null);
                        setMeasureValue('');
                        setMeasurePos(null);
                      }
                    }}
                    className="input"
                    placeholder="Enter length"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => { setMeasureModalOpen(false); setMeasureValue(''); }}>Cancel</Button>
                  <Button onClick={() => {
                    if (activeMeasure && measureValue) {
                      addDimension(activeMeasure.start, activeMeasure.end, parseFloat(measureValue), editingDimIndex);
                    }
                    setMeasureModalOpen(false);
                    setActiveMeasure(null);
                    setMeasureValue('');
                    setMeasurePos(null);
                    setEditingDimIndex(null);
                  }}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Length Input Popup (shows near cursor when adding dimension) */}
          {showLengthInput && dimensionStart && dimensionPreview && (
            <div
              className="fixed z-50 bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-700"
              style={{
                left: (dimensionStart.x + dimensionPreview.x) / 2 + 'px',
                top: (dimensionStart.y + dimensionPreview.y) / 2 + 'px'
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Length"
                  className="w-24 px-2 py-1 bg-slate-900 text-white border border-slate-600 rounded"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const length = parseFloat((e.target as HTMLInputElement).value);
                      if (length > 0) {
                        addDimension(dimensionStart, dimensionPreview, length);
                        setDimensionStart(null);
                        setDimensionPreview(null);
                        setShowLengthInput(false);
                      }
                    }
                  }}
                />
                <select
                  value={measurementUnit}
                  onChange={(e) => setMeasurementUnit(e.target.value as 'meters' | 'feet')}
                  className="bg-slate-900 text-white border border-slate-600 rounded px-1 py-1"
                >
                  <option value="meters">m</option>
                  <option value="feet">ft</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const CropHistoryEditor: React.FC<{
  history: CropHistoryEntry[];
  onAdd: (entry: Omit<CropHistoryEntry, 'id'>) => void;
  onDelete: (id: string) => void;
}> = ({ history, onAdd, onDelete }) => {
  const [cropName, setCropName] = useState('');
  const [season, setSeason] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [yieldPerAcre, setYieldPerAcre] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="mt-6 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
      <h3 className="font-medium mb-3">Crop History</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <input className="input" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="Crop" />
        <input className="input" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Season" />
        <input className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" />
        <input className="input" type="number" value={yieldPerAcre} onChange={(e) => setYieldPerAcre(e.target.value)} placeholder="Yield/acre" />
        <button
          className="btn btn-primary btn-md"
          onClick={() => {
            const yieldValue = parseFloat(yieldPerAcre);
            if (!cropName.trim() || !yieldValue || yieldValue <= 0) return;
            onAdd({
              crop_name: cropName.trim(),
              season: season.trim(),
              year: year.trim(),
              yield_per_acre: yieldValue,
              notes: notes.trim(),
            });
            setCropName('');
            setSeason('');
            setYieldPerAcre('');
            setNotes('');
          }}
        >
          Add
        </button>
      </div>
      <input className="input mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, fertilizer response, pest pressure, market result" />
      {history.length > 0 && (
        <div className="mt-4 space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="app-panel-compact flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{entry.crop_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[entry.season, entry.year].filter(Boolean).join(' • ')} • {entry.yield_per_acre} per acre
                </p>
                {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => onDelete(entry.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandManagementPage;
