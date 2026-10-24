import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function RegistrationApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('PENDING');

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await api.getRegistrationRequests();
      setRequests(data.reverse()); // Newest first
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    if (!window.confirm('Approve this request, create the account, and add 200 credits?')) return;
    setProcessing(id);
    try {
      const res = await api.approveRegistration(id);
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
      alert('Approved successfully!\n\nEmail: ' + res.credentials.email + '\nPassword: ' + res.credentials.password);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id) {
    if (!window.confirm('Are you sure you want to reject this request? It will be saved in your leads but will not get an account.')) return;
    setProcessing(id);
    try {
      await api.rejectRegistration(id);
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  }

  const baseUploadUrl = API_BASE.replace('/api', '');

  const filteredRequests = requests.filter(r => r.status === activeTab);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Registration Requests (Leads)</h1>
          <p className="page-sub">Review incoming requests, verify business cards, and manage your historical lead data.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
        <button 
          onClick={() => setActiveTab('PENDING')} 
          className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-outline'}`}
        >
          Pending ({requests.filter(r => r.status === 'PENDING').length})
        </button>
        <button 
          onClick={() => setActiveTab('APPROVED')} 
          className={`btn ${activeTab === 'APPROVED' ? 'btn-primary' : 'btn-outline'}`}
        >
          Approved Leads ({requests.filter(r => r.status === 'APPROVED').length})
        </button>
        <button 
          onClick={() => setActiveTab('REJECTED')} 
          className={`btn ${activeTab === 'REJECTED' ? 'btn-primary' : 'btn-outline'}`}
        >
          Rejected Leads ({requests.filter(r => r.status === 'REJECTED').length})
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div style={{ padding: 20 }}>Loading database...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>No {activeTab.toLowerCase()} requests</div>
          <p>There are currently no records in this list.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User / Contact</th>
                <th>Institute Info</th>
                <th>Business Card</th>
                <th style={{ textAlign: 'right' }}>Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr key={req.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 13 }}>{new Date(req.createdAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{new Date(req.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.fullName}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{req.email}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>WhatsApp: {req.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.instituteName}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Type: {req.userType}</div>
                    {req.gbpLink && (
                      <a href={req.gbpLink} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--premium-blue)', textDecoration: 'underline' }}>View Google Profile</a>
                    )}
                  </td>
                  <td>
                    {req.businessCardUrl ? (
                      <a href={baseUploadUrl + req.businessCardUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}>
                        View Document
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>No Document</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {activeTab === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ color: 'red', borderColor: 'red', padding: '6px 12px', fontSize: 13 }}
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                        >
                          Reject
                        </button>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleApprove(req.id)}
                          disabled={processing === req.id}
                          style={{ padding: '6px 12px', fontSize: 13 }}
                        >
                          {processing === req.id ? 'Processing...' : 'Approve & Allocate Credits'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: 12, 
                        fontWeight: 600,
                        background: activeTab === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                        color: activeTab === 'APPROVED' ? '#166534' : '#991b1b' 
                      }}>
                        {activeTab}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
