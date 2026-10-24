const fs = require("fs");

const searchModalCode = `
import { useState, useRef } from 'react';

export default function SearchImageModal({ onClose, onSelect }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const fileInput = useRef();

  async function handleSearch() {
    if (!file) {
      setError('Please select an image first.');
      return;
    }
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch('http://localhost:4000/api/questions/search-image', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search');
      
      setResults(data.matches || []);
      if ((data.matches || []).length === 0) {
        setError('No matching questions found in the bank.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: 600, maxWidth: '90%' }}>
        <div className="modal-header">
          <h2>Search by Screenshot</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>Upload a screenshot of the question (including math/equations). The AI will analyze it and find the best matches.</p>
          
          <div style={{ margin: '20px 0' }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setFile(e.target.files[0])}
              ref={fileInput}
              style={{ display: 'none' }}
            />
            <button className="btn btn-secondary" onClick={() => fileInput.current.click()}>
              Choose Image
            </button>
            <span style={{ marginLeft: 10 }}>{file ? file.name : 'No file chosen'}</span>
          </div>

          <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !file}>
            {loading ? 'Analyzing image...' : 'Search Question Bank'}
          </button>

          {error && <div className="alert alert-danger" style={{ marginTop: 15 }}>{error}</div>}

          {results.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>Top Matches</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 10 }}>
                {results.map((q, idx) => (
                  <div key={q.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, marginRight: 15 }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--navy)', marginBottom: 4 }}>
                          Match: {q.matchScore}%
                        </div>
                        <div style={{ fontSize: '13px', color: '#555', marginBottom: 4 }}>
                          {q.chapter?.subject?.name} &gt; {q.chapter?.name}
                        </div>
                        <div style={{ fontSize: '14px' }}>
                          {q.questionText}
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => onSelect(q)}>
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync("frontend/src/components/SearchImageModal.jsx", searchModalCode, "utf8");
