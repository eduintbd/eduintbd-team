import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { STORE_NAME } from '@bhai-store/shared';
import toast from 'react-hot-toast';

export default function Login() {
  const [pin, setPin] = useState('');
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check auth status on first render
  useEffect(() => {
    api.get('/auth/status').then(r => setIsSetup(r.data.data.isSetup));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isSetup ? '/auth/login' : '/auth/setup';
      const res = await api.post(endpoint, { pin });
      localStorage.setItem('token', res.data.data.token);
      toast.success(isSetup ? 'Logged in!' : 'PIN set up successfully!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{STORE_NAME}</h1>
          <p className="text-gray-500 mt-2">Expense Tracker</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isSetup === false ? 'Set up your PIN' : 'Enter PIN'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-6 digit PIN"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={pin.length < 4 || loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Please wait...' : isSetup === false ? 'Set PIN & Continue' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
