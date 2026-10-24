const fs = require("fs");

const editModalCode = `
import { useState } from 'react';
import { api } from '../lib/api';

export default function EditQuestionModal({ question, onClose, onSave }) {
  const [formData, setFormData] = useState({
    questionText: question.questionText || '',
    optionA: question.optionA || '',
    optionB: question.optionB || '',
    optionC: question.optionC || '',
    optionD: question.optionD || '',
    correctOption: question.correctOption || 'A',
    solutionText: question.solutionText || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await api.updateQuestion(question.id, formData);
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: 700, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Edit Question</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{fontSize: 12, color: '#666', marginBottom: 15}}>
            <strong>Question ID:</strong> {question.id}
          </p>

          {error && <div className="alert alert-danger" style={{ marginBottom: 15 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="field">
              <label>Question Text</label>
              <textarea 
                name="questionText" 
                value={formData.questionText} 
                onChange={handleChange} 
                rows={4} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4 }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="field">
                <label>Option A</label>
                <input name="optionA" value={formData.optionA} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4 }} />
              </div>
              <div className="field">
                <label>Option B</label>
                <input name="optionB" value={formData.optionB} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4 }} />
              </div>
              <div className="field">
                <label>Option C</label>
                <input name="optionC" value={formData.optionC} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4 }} />
              </div>
              <div className="field">
                <label>Option D</label>
                <input name="optionD" value={formData.optionD} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4 }} />
              </div>
            </div>

            <div className="field">
              <label>Correct Option</label>
              <select 
                name="correctOption" 
                value={formData.correctOption} 
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4 }}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div className="field">
              <label>Solution / Explanation (Optional)</label>
              <textarea 
                name="solutionText" 
                value={formData.solutionText} 
                onChange={handleChange} 
                rows={4} 
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync("frontend/src/components/EditQuestionModal.jsx", editModalCode, "utf8");
