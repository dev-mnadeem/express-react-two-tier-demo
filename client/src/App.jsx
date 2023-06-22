import { useState } from "react";
import { Button, Container } from "react-bootstrap";

import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { Pager } from "./components/Pager";
import { StatusPanel } from "./components/StatusPanel";
import { UserFormModal } from "./components/UserFormModal";
import { UserTable } from "./components/UserTable";
import { useUsers } from "./hooks/useUsers";

const PAGE_SIZE = 10;

function App() {
  const {
    users,
    pagination,
    status,
    error,
    refresh,
    saveUser,
    removeUser,
    goToPage,
  } = useUsers({ pageSize: PAGE_SIZE });

  const [formUser, setFormUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState(null);

  const openCreate = () => {
    setFormUser(null);
    setIsFormOpen(true);
  };

  const openEdit = (user) => {
    setFormUser(user);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormUser(null);
  };

  const hasUsers = status === "ready" && users.length > 0;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Container className="d-flex align-items-center justify-content-between gap-3 py-3">
          <div className="d-flex align-items-center gap-2">
            <span className="brand-mark" aria-hidden="true">
              R
            </span>
            <span className="brand-name">Roster</span>
          </div>

          <span className="tagline d-none d-sm-inline">User directory</span>
        </Container>
      </header>

      <Container as="main" className="py-4 py-md-5">
        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-between align-items-sm-end mb-4">
          <div>
            <h1 className="page-title">Users</h1>
            <p className="text-muted mb-0" aria-live="polite">
              {status === "ready"
                ? `${pagination.total} registered ${
                    pagination.total === 1 ? "user" : "users"
                  }`
                : "\u00a0"}
            </p>
          </div>

          <div className="header-actions">
            <Button onClick={openCreate}>
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Add user
            </Button>
          </div>
        </div>

        <section className="panel" aria-label="User list">
          {hasUsers ? (
            <>
              <UserTable
                users={users}
                onEdit={openEdit}
                onDelete={setUserPendingDelete}
              />
              <Pager pagination={pagination} onChange={goToPage} />
            </>
          ) : (
            <StatusPanel
              status={status}
              error={error}
              onRetry={refresh}
              onAdd={openCreate}
            />
          )}
        </section>
      </Container>

      <UserFormModal
        show={isFormOpen}
        selectedUser={formUser}
        onClose={closeForm}
        onSave={saveUser}
      />

      <ConfirmDeleteModal
        user={userPendingDelete}
        onCancel={() => setUserPendingDelete(null)}
        onConfirm={(user) => removeUser(user.id)}
      />
    </div>
  );
}

export default App;
