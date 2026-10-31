import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function extractPrefix(filename) {
  const clean = filename.replace(/\.(png|jpg|jpeg)$/i, '');
  const parts = clean.split(/[-_]/);
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`.toUpperCase();
  }
  return parts[0].toUpperCase();
}

export default function ImageLibrary() {
  const [images, setImages] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [lastUploadBatch, setLastUploadBatch] = useState(null); // { count, files, timestamp }
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  // Filters, search & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [pageSize, setPageSize] = useState(36);
  const [currentPage, setCurrentPage] = useState(1);

  // Selection & Feedback
  const [selected, setSelected] = useState(new Set());
  const [copiedName, setCopiedName] = useState(null);
  const [copiedFeedback, setCopiedFeedback] = useState(null);

  // Lightbox Modal
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxBg, setLightboxBg] = useState('light'); // 'light' | 'dark'

  function load() {
    setLoading(true);
    api.listImages()
      .then((res) => {
        setImages(res.images || []);
        if (typeof res.totalBytes === 'number') {
          setTotalBytes(res.totalBytes);
        } else {
          const sum = (res.images || []).reduce((acc, img) => acc + (img.sizeBytes || 0), 0);
          setTotalBytes(sum);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadImages(files);
      setLastUploadBatch({
        count: res.uploaded.length,
        files: res.uploaded,
        timestamp: new Date(),
      });
      setSelectedPrefix('ALL');
      setSearchQuery('');
      setSortBy('NEWEST');
      setCurrentPage(1);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(filename) {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? Any questions using this image will have it unlinked.`)) {
      return;
    }
    setError(null);
    try {
      await api.deleteImage(filename);
      showToast(`Deleted "${filename}".`);
      if (lightboxIndex !== null) setLightboxIndex(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(oldFilename) {
    const newFilename = window.prompt('Enter new filename (including .png or .jpg extension):', oldFilename);
    if (!newFilename || newFilename.trim() === '' || newFilename.trim() === oldFilename) return;
    setError(null);
    try {
      const res = await api.renameImage(oldFilename, newFilename.trim());
      showToast(`Renamed "${oldFilename}" to "${res.newFilename}".`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function showToast(msg) {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  }

  function handleCopy(filename) {
    navigator.clipboard.writeText(filename);
    setCopiedName(filename);
    setTimeout(() => setCopiedName(null), 2000);
  }

  function copyBatchFilenames(files, mode) {
    const names = files.map((f) => f.savedFilename);
    const text = mode === 'LINES' ? names.join('\n') : names.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedFeedback(mode === 'LINES' ? 'BATCH_LINES' : 'BATCH_COMMA');
    setTimeout(() => setCopiedFeedback(null), 2500);
  }

  function copySelectedFilenames(mode) {
    const list = Array.from(selected);
    if (list.length === 0) return;
    const text = mode === 'LINES' ? list.join('\n') : list.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedFeedback(mode === 'LINES' ? 'SEL_LINES' : 'SEL_COMMA');
    setTimeout(() => setCopiedFeedback(null), 2500);
  }

  function downloadFilenamesCsv(files) {
    const headers = 'Index,Filename,Excel_ImageFilename_Column\n';
    const rows = files.map((f, i) => `${i + 1},"${f.savedFilename}","${f.savedFilename}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uploaded_diagram_filenames_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function toggleSelect(filename) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }

  function selectAllCurrentPage(pageList) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOnPageSelected = pageList.every((img) => next.has(img.filename));
      if (allOnPageSelected) {
        pageList.forEach((img) => next.delete(img.filename));
      } else {
        pageList.forEach((img) => next.add(img.filename));
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    const list = Array.from(selected);
    if (list.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.length} selected image${list.length > 1 ? 's' : ''}? Any questions using these images will have them unlinked.`)) {
      return;
    }
    setError(null);
    try {
      const res = await api.bulkDeleteImages(list);
      showToast(`Deleted ${res.deletedCount} images.`);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Common prefix extraction for smart filter chips
  const prefixCounts = useMemo(() => {
    const map = {};
    for (const img of images) {
      const p = extractPrefix(img.filename);
      map[p] = (map[p] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [images]);

  // Filtering & Sorting
  const filteredImages = useMemo(() => {
    let list = [...images];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((img) => img.filename.toLowerCase().includes(q));
    }

    if (selectedPrefix !== 'ALL') {
      list = list.filter((img) => extractPrefix(img.filename) === selectedPrefix);
    }

    if (sortBy === 'NEWEST') {
      list.sort((a, b) => (new Date(b.mtime || 0) - new Date(a.mtime || 0)) || a.filename.localeCompare(b.filename));
    } else if (sortBy === 'OLDEST') {
      list.sort((a, b) => (new Date(a.mtime || 0) - new Date(b.mtime || 0)) || a.filename.localeCompare(b.filename));
    } else if (sortBy === 'NAME_ASC') {
      list.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
    } else if (sortBy === 'NAME_DESC') {
      list.sort((a, b) => b.filename.localeCompare(a.filename, undefined, { numeric: true }));
    } else if (sortBy === 'SIZE_DESC') {
      list.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else if (sortBy === 'SIZE_ASC') {
      list.sort((a, b) => (a.sizeBytes || 0) - (b.sizeBytes || 0));
    }

    return list;
  }, [images, searchQuery, selectedPrefix, sortBy]);

  // Pagination
  const effectivePageSize = pageSize === 'ALL' ? filteredImages.length || 1 : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredImages.length / effectivePageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageImages = useMemo(() => {
    if (pageSize === 'ALL') return filteredImages;
    const start = (activePage - 1) * effectivePageSize;
    return filteredImages.slice(start, start + effectivePageSize);
  }, [filteredImages, activePage, effectivePageSize, pageSize]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : filteredImages.length - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev < filteredImages.length - 1 ? prev + 1 : 0));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredImages]);

  const activeLightboxImage = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Diagram & Asset Hub</p>
        <h1 className="page-title">Image Library</h1>
        <p className="page-sub">
          Upload physics, chemistry, and mathematics diagrams here. Reference the exact filenames below
          in your question bank Excel's <strong>ImageFilename</strong> or <strong>OptionAImage - OptionDImage</strong> columns.
        </p>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14,
        marginBottom: 20,
      }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: 0.5 }}>TOTAL IN LIBRARY</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
            {images.length} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-soft)' }}>diagrams</span>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #22c55e' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: 0.5 }}>LAST UPLOAD BATCH</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: lastUploadBatch ? '#16a34a' : 'var(--ink)', marginTop: 4 }}>
            {lastUploadBatch ? `${lastUploadBatch.count} uploaded` : 'None this session'}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: 0.5 }}>TOTAL DISK STORAGE</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
            {formatBytes(totalBytes)}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: 0.5 }}>MATCHING DISPLAY</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
            {filteredImages.length} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-soft)' }}>of {images.length}</span>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        className={`dropzone${dragActive ? ' active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{ marginBottom: 20 }}
      >
        <div className="dropzone-icon">🖼️</div>
        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
          {uploading ? 'Uploading diagrams to library…' : 'Drag diagram images here, or click to browse'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          PNG or JPG, up to 8MB each — upload batches of 50, 100, or more at once
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Modern Upload Success Notification Card */}
      {lastUploadBatch && (
        <div className="card" style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #86efac',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(34, 197, 94, 0.12)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#22c55e', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(34,197,94,0.35)'
              }}>
                ✓
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#14532d', fontWeight: 700 }}>
                  Successfully Uploaded {lastUploadBatch.count} Image{lastUploadBatch.count !== 1 ? 's' : ''}!
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#166534' }}>
                  All filenames are now active in the library and ready to link into your Excel sheet.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: 13, color: '#166534', background: 'rgba(255,255,255,0.6)' }}
              onClick={() => setLastUploadBatch(null)}
              title="Dismiss"
            >
              ✕ Dismiss
            </button>
          </div>

          {/* Quick Action Toolbar */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: 13, padding: '7px 14px' }}
              onClick={() => copyBatchFilenames(lastUploadBatch.files, 'LINES')}
            >
              {copiedFeedback === 'BATCH_LINES' ? '✓ Copied to Clipboard!' : '📋 Copy for Excel Column (1 per line)'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ background: '#fff', borderColor: '#86efac', fontSize: 13, padding: '7px 14px', color: '#15803d' }}
              onClick={() => copyBatchFilenames(lastUploadBatch.files, 'COMMA')}
            >
              {copiedFeedback === 'BATCH_COMMA' ? '✓ Copied All!' : '📋 Copy Comma-Separated'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ background: '#fff', borderColor: '#86efac', fontSize: 13, padding: '7px 14px', color: '#15803d' }}
              onClick={() => downloadFilenamesCsv(lastUploadBatch.files)}
            >
              📥 Download Filename List (.csv)
            </button>
          </div>

          {/* Filename Chips Preview */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
              Batch Filenames (click any filename to copy individually):
            </div>
            <div style={{
              maxHeight: 130, overflowY: 'auto', background: 'rgba(255,255,255,0.85)',
              padding: '10px 12px', borderRadius: 8, border: '1px solid #bbf7d0',
              display: 'flex', flexWrap: 'wrap', gap: 6
            }}>
              {lastUploadBatch.files.map((f) => (
                <span
                  key={f.savedFilename}
                  onClick={() => handleCopy(f.savedFilename)}
                  style={{
                    background: copiedName === f.savedFilename ? '#dcfce7' : '#fff',
                    border: '1px solid #86efac', borderRadius: 6,
                    padding: '3px 8px', fontSize: 12, fontFamily: 'monospace',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                    color: copiedName === f.savedFilename ? '#15803d' : '#1e293b',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  title="Click to copy filename"
                >
                  {f.savedFilename}
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{copiedName === f.savedFilename ? '✓' : '📋'}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          {successToast}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Search, Filter & Controls Toolbar */}
      <div className="card card-pad" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Live Search Input */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search by filename (e.g. PHY-EMI, ALC, 001_Q)..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', paddingLeft: 12 }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', margin: 0 }}>Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              style={{ padding: '6px 10px', fontSize: 13 }}
            >
              <option value="NEWEST">Newest Uploads First</option>
              <option value="OLDEST">Oldest Uploads First</option>
              <option value="NAME_ASC">Filename (A → Z)</option>
              <option value="NAME_DESC">Filename (Z → A)</option>
              <option value="SIZE_DESC">File Size (Largest)</option>
              <option value="SIZE_ASC">File Size (Smallest)</option>
            </select>
          </div>

          {/* Per Page Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', margin: 0 }}>Show:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '6px 10px', fontSize: 13 }}
            >
              <option value="24">24</option>
              <option value="36">36</option>
              <option value="72">72</option>
              <option value="120">120</option>
              <option value="ALL">All ({filteredImages.length})</option>
            </select>
          </div>
        </div>

        {/* Smart Prefix Filter Chips */}
        {prefixCounts.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginRight: 4 }}>Chapter / Prefix:</span>
            <button
              type="button"
              className={`btn ${selectedPrefix === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '3px 10px', fontSize: 12, borderRadius: 16 }}
              onClick={() => { setSelectedPrefix('ALL'); setCurrentPage(1); }}
            >
              All ({images.length})
            </button>
            {prefixCounts.slice(0, 12).map(([prefix, count]) => (
              <button
                key={prefix}
                type="button"
                className={`btn ${selectedPrefix === prefix ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 10px', fontSize: 12, borderRadius: 16 }}
                onClick={() => { setSelectedPrefix(prefix); setCurrentPage(1); }}
              >
                {prefix} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Selection Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12.5, padding: '5px 12px' }}
            onClick={() => selectAllCurrentPage(pageImages)}
          >
            {pageImages.length > 0 && pageImages.every((img) => selected.has(img.filename)) ? 'Deselect Page' : `Select Page (${pageImages.length})`}
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12.5, padding: '5px 12px' }}
              onClick={() => setSelected(new Set())}
            >
              Clear Selection
            </button>
          )}
        </div>

        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {selected.size} selected
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12.5, padding: '5px 10px' }}
              onClick={() => copySelectedFilenames('LINES')}
            >
              {copiedFeedback === 'SEL_LINES' ? '✓ Copied!' : '📋 Copy Selected'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444', fontSize: 12.5, padding: '5px 12px' }}
              onClick={handleBulkDelete}
            >
              🗑️ Delete Selected ({selected.size})
            </button>
          </div>
        )}
      </div>

      {/* Main Image Grid */}
      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
      ) : filteredImages.length === 0 ? (
        <div className="card empty-state" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <h3 style={{ margin: '0 0 6px' }}>No diagram images found</h3>
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>
            {searchQuery || selectedPrefix !== 'ALL'
              ? 'Try adjusting your search terms or clearing the prefix filter.'
              : 'Upload your first diagram images above.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 14,
            marginBottom: 24,
          }}>
            {pageImages.map((img) => {
              const isSelected = selected.has(img.filename);
              const globalIndex = filteredImages.indexOf(img);
              return (
                <div
                  key={img.filename}
                  className="card"
                  style={{
                    padding: 10,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid var(--line)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.04)' : '#fff',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderRadius: 8,
                  }}
                >
                  {/* Select Checkbox */}
                  <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(img.filename)}
                      style={{ width: 17, height: 17, cursor: 'pointer' }}
                    />
                  </div>

                  {/* Size Badge */}
                  {img.sizeBytes > 0 && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 2,
                      background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10,
                      padding: '2px 5px', borderRadius: 4, fontWeight: 500
                    }}>
                      {formatBytes(img.sizeBytes)}
                    </div>
                  )}

                  {/* Image Thumbnail with Lightbox trigger */}
                  <div
                    onClick={() => setLightboxIndex(globalIndex)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 6,
                      background: 'var(--paper-dim)',
                      padding: 6,
                      marginBottom: 8,
                      position: 'relative',
                    }}
                    title="Click to view full diagram"
                  >
                    <img
                      src={`${api.imageBase()}${img.url}`}
                      alt={img.filename}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 110,
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 6, right: 6,
                      background: 'rgba(255,255,255,0.85)', borderRadius: 4,
                      padding: '2px 5px', fontSize: 11, color: 'var(--ink)'
                    }}>
                      🔍 Zoom
                    </div>
                  </div>

                  {/* Filename & Details */}
                  <div style={{ marginBottom: 8 }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        wordBreak: 'break-all',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        lineHeight: 1.3,
                        minHeight: 28,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleCopy(img.filename)}
                      title={`Click to copy: ${img.filename}`}
                    >
                      {img.filename}
                    </div>
                    {img.mtime && (
                      <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                        {formatDate(img.mtime)}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex', gap: 4, justifyContent: 'center',
                    borderTop: '1px solid var(--line)', paddingTop: 8
                  }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '3px 8px', fontSize: 11, flex: 1 }}
                      onClick={() => handleCopy(img.filename)}
                      title="Copy exact filename for Excel"
                    >
                      {copiedName === img.filename ? '✓ Copied' : '📋 Copy'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '3px 7px', fontSize: 11 }}
                      onClick={() => handleRename(img.filename)}
                      title="Rename this file"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '3px 7px', fontSize: 11, color: '#ef4444' }}
                      onClick={() => handleDelete(img.filename)}
                      title="Delete this file"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && pageSize !== 'ALL' && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={activePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>

              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Page <strong>{activePage}</strong> of <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                className="btn btn-ghost"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Lightbox Modal (Full-Screen Diagram Inspector) */}
      {activeLightboxImage && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 780, width: '100%', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              padding: 0, borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              background: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 18px', borderBottom: '1px solid var(--line)', background: 'var(--paper-dim)'
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
                  DIAGRAM PREVIEW ({lightboxIndex + 1} of {filteredImages.length})
                </div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  {activeLightboxImage.filename}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 8px' }}
                  onClick={() => setLightboxBg((bg) => (bg === 'light' ? 'dark' : 'light'))}
                  title="Toggle background contrast"
                >
                  {lightboxBg === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 16, padding: '4px 10px', fontWeight: 700 }}
                  onClick={() => setLightboxIndex(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Image Body with navigation arrows */}
            <div style={{
              flex: 1, position: 'relative', minHeight: 320,
              background: lightboxBg === 'light' ? '#f8fafc' : '#0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, overflow: 'hidden'
            }}>
              <img
                src={`${api.imageBase()}${activeLightboxImage.url}`}
                alt={activeLightboxImage.filename}
                style={{
                  maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain',
                  borderRadius: 6,
                  filter: lightboxBg === 'dark' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' : 'none'
                }}
              />

              {/* Prev / Next buttons */}
              {filteredImages.length > 1 && (
                <>
                  <button
                    type="button"
                    style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.85)', border: '1px solid var(--line)',
                      borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
                      fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : filteredImages.length - 1))}
                    title="Previous diagram (Left Arrow)"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.85)', border: '1px solid var(--line)',
                      borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
                      fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => setLightboxIndex((prev) => (prev < filteredImages.length - 1 ? prev + 1 : 0))}
                    title="Next diagram (Right Arrow)"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 18px', borderTop: '1px solid var(--line)', background: 'var(--paper-dim)',
              flexWrap: 'wrap', gap: 10
            }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                {activeLightboxImage.sizeBytes > 0 && <span>Size: <strong>{formatBytes(activeLightboxImage.sizeBytes)}</strong> · </span>}
                {activeLightboxImage.mtime && <span>Uploaded: <strong>{formatDate(activeLightboxImage.mtime)}</strong></span>}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleCopy(activeLightboxImage.filename)}
                >
                  {copiedName === activeLightboxImage.filename ? '✓ Copied!' : '📋 Copy Filename for Excel'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleRename(activeLightboxImage.filename)}
                >
                  ✏️ Rename
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: '#ef4444' }}
                  onClick={() => handleDelete(activeLightboxImage.filename)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
