'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { TableSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

export default function AdminUsersTab({ loadingData, loading, setLoading, setError, toast, t, setConfirmAction }: AdminTabProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await api.admin.users({ limit: 100 });
      setUsers(data.users);
    } catch (err: any) { setError(err.message); }
  }

  async function handleCreateUser() {
    if (!newUser.username.trim() || newUser.password.length < 8) return;
    setLoading(true);
    setError('');
    try {
      await api.admin.createUser({
        username: newUser.username.trim().toLowerCase(),
        password: newUser.password,
      });
      toast(t('created') + ': ' + newUser.username.trim().toLowerCase(), 'success');
      setNewUser({ username: '', password: '' });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleUserRole(user: any) {
    try {
      await api.admin.updateUser(user._id, { role: user.role === 'admin' ? 'user' : 'admin' });
      loadUsers();
    } catch (err: any) { setError(err.message); }
  }

  function handleDeleteUser(id: string, username: string) {
    setConfirmAction({
      title: t('deleteUser'),
      message: `Delete user "${username}" and all their emails?`,
      onConfirm: async () => {
        try {
          await api.admin.deleteUser(id);
          loadUsers();
        } catch (err: any) { setError(err.message); }
      },
    });
  }

  if (loadingData) return <TableSkeleton />;

  return (
    <div>
      <div className="add-domain-form">
        <input
          className="input"
          placeholder={t('username')}
          value={newUser.username}
          onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
        />
        <input
          className="input"
          type="password"
          placeholder={t('minChars')}
          value={newUser.password}
          onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={handleCreateUser}
          disabled={loading || newUser.username.length < 3 || newUser.password.length < 8}
        >
          {t('createAccount')}
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('username_col')}</th>
              <th>{t('email_col')}</th>
              <th>{t('role')}</th>
              <th>{t('accounts')}</th>
              <th>{t('joined')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-tag ${user.role}`}>{user.role}</span>
                </td>
                <td>{user.emailCount || 0}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggleUserRole(user)}>
                    {user.role === 'admin' ? t('revokeAdmin') : t('makeAdmin')}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(user._id, user.username)}>
                    {t('deleteUser')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
