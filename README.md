# Vehicle Management System — Web Frontend


A web-based interface for a vehicle rental and dispatch database. It supports full CRUD (view, add, edit, delete) across every table in a MySQL database hosted on Concordia's ENCS servers.

## Team

- James Victor Alvarez
- Alexander Hristov
- Likun Gu
- Joshua Graham

---

## Architecture

The application has two halves:

| Part | Location | Responsibility |
|---|---|---|
| Backend | `server.js` | Express server, SSH tunnel, REST API over MySQL |
| Frontend | `public/` | Vanilla HTML/CSS/JS client that consumes the API |

### Why an SSH tunnel

The MySQL instance lives on a university server that only accepts connections from inside the ENCS network. From a laptop you'd normally do this in two manual steps:

```bash
ssh <encs_username>@login.encs.concordia.ca
mysql -h <db_host> -u <db_user> -p <db_name>
```

The backend automates both steps. On startup it opens an SSH connection to the ENCS login node and forwards a local port to the MySQL host through it, so the rest of the application can treat the remote database as if it were local.

```
Browser (localhost:3000)
        │
        ▼
Express server  ──  REST API
        │
        ▼
SSH tunnel  ──  login.encs.concordia.ca
        │
        ▼
MySQL  ──  <db_host>.encs.concordia.ca
```

The tunnel is created once at startup and stays open for the process lifetime. Queries run over a **connection pool** (`mysql2`) rather than opening a fresh connection per request, so concurrent requests reuse warm connections instead of paying the handshake cost each time.

---

## Security

- **Parameterized queries** — every value from the client is bound through `?` placeholders, so user input is never concatenated into SQL. This is the primary defense against SQL injection.
- **Table whitelist** — the API only accepts table names from a list defined in the server. A request naming any other table is rejected before it reaches the database.
- **Column validation** — inserts and updates are checked against the known schema, so unknown columns can't be injected into a statement.
- **Credentials outside the repository** — all secrets live in `.env`, which is listed in `.gitignore` and never committed. `.env.example` documents the required keys without their values.

---

## Setup

### Prerequisites

- Node.js
- ENCS SSH credentials (your own username and password)
- MySQL credentials for the course database

### 1. Install dependencies

```bash
npm install
```

Installs `express`, `mysql2`, `ssh2`, `dotenv`, and `cors`.

### 2. Configure credentials

```bash
cp .env.example .env
```

Open `.env` and fill in:

```
SSH_USER=your_encs_username
SSH_PASSWORD=your_encs_password
DB_HOST=<host>.encs.concordia.ca
DB_PORT=3306
DB_USER=<db_user>
DB_PASSWORD=<db_password>
DB_NAME=<db_name>
```

### 3. Start the server

```bash
npm start
```

A successful startup prints:

```
SSH connection established
SSH tunnel open on local port XXXXX
MySQL connection verified
Server running at http://localhost:3000
```

Establishing the tunnel can take a while, and it sometimes fails outright — just run it again. If you see `All configured authentication methods failed`, the `SSH_USER` or `SSH_PASSWORD` in your `.env` is wrong.

### 4. Open the app

Visit <http://localhost:3000>.

Stop the server with `Ctrl + C`.

---

## Usage note

Deletes are constrained by foreign keys. A record can't be removed while other records still reference it — for example, a `Customer` with existing `Reservation` rows will refuse to delete until those reservations are gone.

---

## Project structure

```
Website/
├── server.js          # Express server, SSH tunnel, REST API
├── package.json       # Dependencies and scripts
├── .env               # Your credentials (git-ignored)
├── .env.example       # Template for credentials
├── .gitignore         # Ignores node_modules and .env
└── public/
    ├── index.html     # Page layout, sidebar, modals
    ├── style.css      # Styling
    └── app.js         # Client logic: CRUD, forms, search
```

## Database schema

| Table | Description |
|---|---|
| `Customer` | All customers (type `E` = Enterprise, `I` = Individual) |
| `Entreprise` | Enterprise customer details (FK → `Customer`) |
| `Individual` | Individual customer details (FK → `Customer`) |
| `Reservation` | Booking records linked to customers |
| `Mission` | Driving missions linked to reservations, drivers, vehicles |
| `Vehicle` | Fleet vehicles with rates and license requirements |
| `Driver` | Driver records |
| `License` | License types (Class T, H, S, etc.) |
| `Driver_License` | Links drivers to licenses (many-to-many) |
| `Garage` | Garage locations |
| `Tax_Rate` | Tax rates applied to invoices |
| `Invoice` | Billing invoices linked to customers and tax rates |
| `Invoice_Line` | Line items on invoices (FK → `Invoice`, `Mission`) |
| `Payment` | Payments made against invoices |

## Tech stack

| | |
|---|---|
| **Node.js** | Backend runtime |
| **Express** | Web server and routing |
| **mysql2** | MySQL driver with connection pooling |
| **ssh2** | SSH client for the tunnel to ENCS |
| **dotenv** | Loads credentials from `.env` |
| **HTML / CSS / JS** | Frontend — vanilla, no framework |
