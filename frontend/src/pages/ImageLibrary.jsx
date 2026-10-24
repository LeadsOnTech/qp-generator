import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function ImageLibrary() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  function load() {
    setLoading(true);
    api.listImages()
      .then((res) => setImages(res.images))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.uploadImages(files);
      setMessage(
        `Uploaded ${res.uploaded.length} image${res.uploaded.length !== 1 ? 's' : ''}. ` +
        `Use these exact filenames in your Excel's ImageFilename column: ` +
        res.uploaded.map((f) => f.savedFilename).join(', ')
      );
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
    setMessage(null);
    try {
      await api.deleteImage(filename);
      setMessage(`Deleted "${filename}".`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(oldFilename) {
    const newFilename = window.prompt('Enter new filename (including .png or .jpg extension):', oldFilename);
    if (!newFilename || newFilename.trim() === '' || newFilename.trim() === oldFilename) return;
    setError(null);
    setMessage(null);
    try {
      const res = await api.renameImage(oldFilename, newFilename.trim());
      setMessage(`Renamed "${oldFilename}" to "${res.newFilename}". Any linked questions were also updated.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const [copiedName, setCopiedName] = useState(null);
  const [selected, setSelected] = useState(new Set());

  function handleCopy(filename) {
    navigator.clipboard.writeText(filename);
    setCopiedName(filename);
    setTimeout(() => setCopiedName(null), 2000);
  }

  function toggleSelect(filename) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map((img) => img.filename)));
    }
  }

  async function handleBulkDelete() {
    const list = Array.from(selected);
    if (list.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.length} selected image${list.length > 1 ? 's' : ''}? Any questions using these images will have them unlinked.`)) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const res = await api.bulkDeleteImages(list);
      setMessage(`Deleted ${res.deletedCount} images.`);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Diagram Support</p>
        <h1 className="page-title">Image Library</h1>
        <p className="page-sub">
          Upload diagram images here first (PNG/JPG), then reference the exact filename shown below
          in your Excel's <strong>ImageFilename</strong> or <strong>QuestionImage / OptionAImage</strong> columns when uploading Diagram-based questions.
        </p>
      </div>

      <div
        className={`dropzone${dragActive ? ' active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="dropzone-icon">🖼</div>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>
          {uploading ? 'Uploading…' : 'Drag diagram images here, or click to browse'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>PNG or JPG, up to 8MB each — multiple files at once</p>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {message && <div className="alert alert-success" style={{ marginTop: 20 }}>{message}</div>}
      {error && <div className="alert alert-danger" style={{ marginTop: 20 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 14px', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>Uploaded images ({images.length})</h3>
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={selectAll}
            >
              {selected.size === images.length ? 'Deselect All' : 'Select All'}
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444', fontSize: 12, padding: '4px 12px' }}
                onClick={handleBulkDelete}
              >
                🗑️ Delete Selected ({selected.size})
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : images.length === 0 ? (
        <div className="card empty-state">
          <h3>No images uploaded yet</h3>
          <p>Upload your first diagram above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {images.map((img) => {
            const isSelected = selected.has(img.filename);
            return (
              <div
                key={img.filename}
                className="card"
                style={{
                  padding: 12,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid var(--line)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.05)' : '#fff',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(img.filename)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </div>
                <div>
                  <img
                    src={`${api.imageBase()}${img.url}`}
                    alt={img.filename}
                    onClick={() => toggleSelect(img.filename)}
                    style={{ width: '100%', height: 110, objectFit: 'contain', marginBottom: 8, borderRadius: 6, background: 'var(--paper-dim)', cursor: 'pointer' }}
                  />
                  <div className="mono" style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--ink-soft)', marginBottom: 8, minHeight: 28 }} title={img.filename}>
                    {img.filename}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => handleCopy(img.filename)}
                    title="Copy filename for Excel"
                  >
                    {copiedName === img.filename ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => handleRename(img.filename)}
                    title="Rename image"
                  >
                    ✏️ Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '3px 8px', fontSize: 11, color: '#ef4444' }}
                    onClick={() => handleDelete(img.filename)}
                    title="Delete image"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
