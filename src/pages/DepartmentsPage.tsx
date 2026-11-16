import { useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { ChangeParentModal } from '../components/ChangeParentModal';
import { CreateDepartmentModal } from '../components/CreateDepartmentModal';
import { DepartmentTree } from '../components/DepartmentTree';
import { EditDepartmentModal } from '../components/EditDepartmentModal';
import { MoveUsersModal } from '../components/MoveUsersModal';
import { Pagination } from '../components/Pagination';
import { useDepartmentRows } from '../hooks/useDepartmentRows';
import {
  DEPARTMENT_SORT_LABELS,
  DEPARTMENT_SORT_OPTIONS,
  matchesSearch,
  sortDepartments,
} from '../utils/departments';
import type { DepartmentSort, FlatDepartment } from '../utils/departments';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'inactive';
type View = 'table' | 'tree';

export function DepartmentsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'super_admin';
  const { rows, isPending, isError, error } = useDepartmentRows();

  const [view, setView] = useState<View>('table');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FlatDepartment | null>(null);
  const [changingParent, setChangingParent] = useState<FlatDepartment | null>(null);
  const [movingUsers, setMovingUsers] = useState<FlatDepartment | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<DepartmentSort>('level-asc');

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => {
      const statusMatches = status === 'all' || row.isActive === (status === 'active');
      return statusMatches && matchesSearch(row, search);
    });
    return sortDepartments(filtered, sort);
  }, [rows, search, status, sort]);

  const total = visible.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = search.trim() !== '' || status !== 'all';

  let emptyText = 'No departments match your filters.';
  if (rows.length === 0) {
    emptyText = canWrite
      ? 'No departments yet. Create the first one with New department.'
      : 'No departments yet.';
  }

  function handleSearchChange(value: string) {
    setPage(1);
    setSearch(value);
  }

  function handleStatusChange(value: string) {
    setPage(1);
    setStatus(value as StatusFilter);
  }

  function handleSortChange(value: string) {
    setPage(1);
    setSort(value as DepartmentSort);
  }

  function clearFilters() {
    setPage(1);
    setSearch('');
    setStatus('all');
  }

  return (
    <>
      <div className="page-header">
        <h1>Departments</h1>
        <div className="page-header__actions">
          <div className="view-switch" role="group" aria-label="View">
            <button
              type="button"
              className={`view-switch__button${view === 'table' ? ' view-switch__button--active' : ''}`}
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={`view-switch__button${view === 'tree' ? ' view-switch__button--active' : ''}`}
              aria-pressed={view === 'tree'}
              onClick={() => setView('tree')}
            >
              Tree
            </button>
          </div>
          {canWrite && (
            <button type="button" className="button button--primary" onClick={() => setCreating(true)}>
              New department
            </button>
          )}
        </div>
      </div>

      {view === 'tree' ? (
        <DepartmentTree />
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="toolbar__search-input"
              placeholder="Search by name or parent"
              aria-label="Search departments"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />

            <label className="toolbar__field">
              Status
              <select value={status} onChange={(e) => handleStatusChange(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="toolbar__field">
              Sort by
              <select value={sort} onChange={(e) => handleSortChange(e.target.value)}>
                {DEPARTMENT_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {DEPARTMENT_SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isPending && <p className="state-message">Loading departments…</p>}

          {isError && (
            <p className="state-message state-message--error">
              {error instanceof ApiError ? error.message : 'Could not load departments.'}
            </p>
          )}

          {!isPending && !isError && (
            <>
              <p className="toolbar__count">
                {hasFilters
                  ? `Showing ${total} of ${rows.length} departments`
                  : `${rows.length} ${rows.length === 1 ? 'department' : 'departments'}`}
              </p>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Level</th>
                      <th>Parent</th>
                      <th>Status</th>
                      {canWrite && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={canWrite ? 5 : 4} className="table__empty">
                          <p>{emptyText}</p>
                          {rows.length > 0 && hasFilters && (
                            <button type="button" className="button" onClick={clearFilters}>
                              Clear filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((dept) => (
                        <tr key={dept.id}>
                          <td>{dept.name}</td>
                          <td>Level {dept.level}</td>
                          <td>{dept.ancestors[dept.ancestors.length - 1] ?? '—'}</td>
                          <td>
                            <Badge tone={dept.isActive ? 'success' : 'neutral'}>
                              {dept.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          {canWrite && (
                            <td>
                              <div className="table__actions">
                                <button type="button" className="button" onClick={() => setEditing(dept)}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="button"
                                  onClick={() => setChangingParent(dept)}
                                >
                                  Change parent
                                </button>
                                <button
                                  type="button"
                                  className="button"
                                  onClick={() => setMovingUsers(dept)}
                                >
                                  Move users
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {total > PAGE_SIZE && (
                <Pagination
                  page={currentPage}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </>
      )}

      {creating && <CreateDepartmentModal onClose={() => setCreating(false)} />}
      {editing && <EditDepartmentModal department={editing} onClose={() => setEditing(null)} />}
      {changingParent && (
        <ChangeParentModal department={changingParent} onClose={() => setChangingParent(null)} />
      )}
      {movingUsers && (
        <MoveUsersModal department={movingUsers} onClose={() => setMovingUsers(null)} />
      )}
    </>
  );
}
