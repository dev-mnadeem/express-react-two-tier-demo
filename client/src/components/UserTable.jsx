import Table from "react-bootstrap/Table";

const initials = (user) =>
  `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

/**
 * Presentational only: it renders rows and raises intent upwards. It holds no
 * state and makes no network calls.
 */
export const UserTable = ({ users, onEdit, onDelete }) => (
  <Table hover responsive className="align-middle user-table mb-0">
    <caption className="visually-hidden">Registered users</caption>
    <thead>
      <tr>
        <th scope="col" className="ps-3 d-none d-md-table-cell">
          ID
        </th>
        <th scope="col" className="ps-3 ps-md-2">
          Name
        </th>
        <th scope="col" className="d-none d-sm-table-cell">
          Email
        </th>
        <th scope="col" className="text-end pe-3">
          Actions
        </th>
      </tr>
    </thead>

    <tbody>
      {users.map((user) => (
        <tr key={user.id}>
          <td className="ps-3 user-id d-none d-md-table-cell">{user.id}</td>

          <td className="ps-3 ps-md-2">
            <div className="d-flex align-items-center gap-2">
              <span className="user-avatar" aria-hidden="true">
                {initials(user)}
              </span>
              <div className="min-w-0">
                <div className="fw-semibold">
                  {user.firstName} {user.lastName}
                </div>
                {/* On phones the email column is hidden, so it sits here. */}
                <div className="user-email small d-sm-none" aria-hidden="true">
                  {user.email}
                </div>
              </div>
            </div>
          </td>

          <td className="user-email d-none d-sm-table-cell">{user.email}</td>

          <td className="text-end pe-3">
            <div className="d-inline-flex gap-1">
              <button
                type="button"
                className="btn btn-sm btn-icon"
                onClick={() => onEdit(user)}
                aria-label={`Edit ${user.firstName} ${user.lastName}`}
              >
                <i className="bi bi-pencil" aria-hidden="true" />
              </button>

              <button
                type="button"
                className="btn btn-sm btn-icon btn-icon-danger"
                onClick={() => onDelete(user)}
                aria-label={`Delete ${user.firstName} ${user.lastName}`}
              >
                <i className="bi bi-trash" aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
);
