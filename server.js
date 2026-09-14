// server.js - Backend for the Vehicle Management System
// This file sets up the Express server, creates an SSH tunnel
// to the university MySQL database, and provides REST API endpoints
// for all CRUD operations (Create, Read, Update, Delete).

// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const express = require('express');
const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const path = require('path');
const cors = require('cors');
const net = require('net');

// Create Express app
const app = express();
app.use(cors());              // Allow cross-origin requests
app.use(express.json());      // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// =============================================================
// TABLE DEFINITIONS
// =============================================================
// This object defines every table in our database.
// It includes primary keys, column names, auto-increment info,
// and how tables join together for display purposes.
// We use this as a whitelist so only valid table names are accepted.
const TABLE_DEFS = {
  Customer: {
    pk: ['Id_Customer'],
    columns: ['Id_Customer', 'Type_Customer', 'Address_Customer', 'Phone_Customer'],
    autoIncrement: 'Id_Customer'
  },
  Entreprise: {
    pk: ['Id_Customer'],
    columns: ['Id_Customer', 'Business_Name'],
    autoIncrement: null,
    joins: [
      { table: 'Customer', on: 'Entreprise.Id_Customer = Customer.Id_Customer', cols: ['Address_Customer'] }
    ]
  },
  Individual: {
    pk: ['Id_Customer'],
    columns: ['Id_Customer', 'First_Name', 'Last_Name'],
    autoIncrement: null,
    joins: [
      { table: 'Customer', on: 'Individual.Id_Customer = Customer.Id_Customer', cols: ['Address_Customer'] }
    ]
  },
  Reservation: {
    pk: ['Id_Reservation'],
    columns: ['Id_Reservation', 'Date_Reservation', 'Status_Reservation', 'Id_Customer'],
    autoIncrement: 'Id_Reservation',
    joins: [
      { table: 'Customer', on: 'Reservation.Id_Customer = Customer.Id_Customer', cols: ['Phone_Customer'] }
    ]
  },
  Garage: {
    pk: ['Id_Garage'],
    columns: ['Id_Garage', 'Location_Garage'],
    autoIncrement: 'Id_Garage'
  },
  Driver: {
    pk: ['Id_Driver'],
    columns: ['Id_Driver', 'First_Name_Driver', 'Last_Name_Driver'],
    autoIncrement: null
  },
  License: {
    pk: ['Id_License'],
    columns: ['Id_License', 'Name_License'],
    autoIncrement: 'Id_License'
  },
  Driver_License: {
    pk: ['Id_License', 'Id_Driver'],
    columns: ['Id_License', 'Id_Driver'],
    autoIncrement: null,
    joins: [
      { table: 'Driver', on: 'Driver_License.Id_Driver = Driver.Id_Driver', cols: ['First_Name_Driver', 'Last_Name_Driver'] },
      { table: 'License', on: 'Driver_License.Id_License = License.Id_License', cols: ['Name_License'] }
    ]
  },
  Vehicle: {
    pk: ['Id_Vehicle'],
    columns: ['Id_Vehicle', 'Plate_Vehicle', 'Brand_Vehicle', 'Category_Vehicle', 'Rate_Per_Hour', 'Rate_Per_Km', 'Id_License'],
    autoIncrement: 'Id_Vehicle',
    joins: [
      { table: 'License', on: 'Vehicle.Id_License = License.Id_License', cols: ['Name_License'] }
    ]
  },
  Mission: {
    pk: ['Id_Mission'],
    columns: [
      'Id_Mission', 'Id_Reservation', 'Id_Driver', 'Id_Vehicle',
      'Id_Garage_Dep', 'Id_Garage_Ret', 'Location_Mission', 'Desired_Vehicle_Type',
      'Appointment_Datetime', 'Planned_Start_Datetime', 'Planned_End_Time',
      'Actual_Start_time', 'Actual_End_Time', 'Odo_Before', 'Odo_After',
      'Week_Published', 'Status_Mission', 'Expected_Duration'
    ],
    autoIncrement: 'Id_Mission',
    joins: [
      { table: 'Driver', on: 'Mission.Id_Driver = Driver.Id_Driver', cols: ['First_Name_Driver', 'Last_Name_Driver'] },
      { table: 'Vehicle', on: 'Mission.Id_Vehicle = Vehicle.Id_Vehicle', cols: ['Plate_Vehicle', 'Brand_Vehicle'] }
    ]
  },
  Tax_Rate: {
    pk: ['Id_Tax'],
    columns: ['Id_Tax', 'Name_Tax', 'Percentage_Tax'],
    autoIncrement: 'Id_Tax'
  },
  Invoice: {
    pk: ['Id_Invoice'],
    columns: ['Id_Invoice', 'Date_Invoice', 'Week_Number', 'Status_Invoice', 'Id_Customer', 'Id_Tax'],
    autoIncrement: 'Id_Invoice',
    joins: [
      { table: 'Customer', on: 'Invoice.Id_Customer = Customer.Id_Customer', cols: ['Phone_Customer'] },
      { table: 'Tax_Rate', on: 'Invoice.Id_Tax = Tax_Rate.Id_Tax', cols: ['Name_Tax', 'Percentage_Tax'] }
    ]
  },
  Invoice_Line: {
    pk: ['Id_Invoice', 'Id_Mission'],
    columns: ['Id_Invoice', 'Id_Mission', 'Duration_Cost', 'Km_Cost', 'Line_Total'],
    autoIncrement: null,
    joins: [
      { table: 'Mission', on: 'Invoice_Line.Id_Mission = Mission.Id_Mission', cols: ['Location_Mission'] }
    ]
  },
  Payment: {
    pk: ['Id_Payment'],
    columns: ['Id_Payment', 'Pay_Date', 'Method', 'Amount', 'Id_Invoice'],
    autoIncrement: 'Id_Payment',
    joins: [
      { table: 'Invoice', on: 'Payment.Id_Invoice = Invoice.Id_Invoice', cols: ['Date_Invoice', 'Status_Invoice'] }
    ]
  }
};

// =============================================================
// DATABASE CONNECTION (SSH TUNNEL + MYSQL POOL)
// =============================================================
// We create the connection ONE TIME at startup.
// The SSH tunnel stays open and the MySQL pool reuses connections
// so we don't have to reconnect for every request.

let pool = null;       // MySQL connection pool (reused for all queries)
let sshClient = null;  // SSH tunnel client
let localServer = null; // Local TCP server for tunneling

// This function creates an SSH tunnel to the university server
// and then connects to MySQL through that tunnel.
// It only runs once when the server starts up.
async function createSSHTunnel() {
  return new Promise((resolve, reject) => {
    sshClient = new Client();

    // When SSH connection is ready, set up the tunnel
    sshClient.on('ready', () => {
      console.log('SSH connection established');

      // Create a local TCP server that forwards traffic to MySQL through SSH
      localServer = net.createServer((sock) => {
        sshClient.forwardOut(
          sock.remoteAddress || '127.0.0.1',
          sock.remotePort || 0,
          process.env.DB_HOST,
          parseInt(process.env.DB_PORT) || 3306,
          (err, stream) => {
            if (err) { sock.end(); return; }
            // Pipe data both ways between local socket and SSH stream
            sock.pipe(stream).pipe(sock);
          }
        );
      });

      // Listen on a random available port
      localServer.listen(0, '127.0.0.1', () => {
        const localPort = localServer.address().port;
        console.log('SSH tunnel open on local port ' + localPort);

        // Create the MySQL connection pool through the tunnel
        // The pool keeps connections alive and reuses them for efficiency
        pool = mysql.createPool({
          host: '127.0.0.1',
          port: localPort,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          waitForConnections: true,
          connectionLimit: 5,    // max 5 connections at a time
          dateStrings: true      // return dates as strings not Date objects
        });

        resolve();
      });
    });

    // Handle SSH errors
    sshClient.on('error', (err) => {
      console.error('SSH connection error:', err.message);
      reject(err);
    });

    // Connect to the university SSH server
    sshClient.connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT) || 22,
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD
    });
  });
}

// =============================================================
// HELPER: Validate table name against our whitelist
// =============================================================
// This prevents SQL injection through the table name parameter.
// If someone tries to pass a bad table name, we reject it.
function getTableDef(tableName) {
  const def = TABLE_DEFS[tableName];
  if (!def) return null;
  return def;
}

// =============================================================
// API ROUTES
// =============================================================

// GET /api/schema - Returns the table structure info to the frontend
// so it knows what columns and primary keys each table has
app.get('/api/schema', (req, res) => {
  const schema = {};
  for (const [name, def] of Object.entries(TABLE_DEFS)) {
    schema[name] = {
      pk: def.pk,
      columns: def.columns,
      autoIncrement: def.autoIncrement
    };
  }
  res.json(schema);
});

// GET /api/options/:table - Returns rows for foreign key dropdowns
// Used when we need to populate a <select> in the form
app.get('/api/options/:table', async (req, res) => {
  const def = getTableDef(req.params.table);
  if (!def) return res.status(400).json({ error: 'Invalid table name' });

  try {
    // Simple select all, ordered by primary key
    const [rows] = await pool.query(
      'SELECT * FROM ?? ORDER BY ?? ASC',
      [req.params.table, def.pk[0]]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/:table - Returns all rows from a table
// Includes LEFT JOINs to show related data (e.g. customer name on a reservation)
app.get('/api/:table', async (req, res) => {
  const tableName = req.params.table;
  const def = getTableDef(tableName);
  if (!def) return res.status(400).json({ error: 'Invalid table name' });

  try {
    // Build the SELECT query with any joins
    let query = 'SELECT `' + tableName + '`.*';
    const joins = def.joins || [];

    // Add columns from joined tables
    for (const j of joins) {
      for (const col of j.cols) {
        query += ', `' + j.table + '`.`' + col + '`';
      }
    }

    query += ' FROM `' + tableName + '`';

    // Add LEFT JOINs so we still get rows even if the FK is null
    for (const j of joins) {
      query += ' LEFT JOIN `' + j.table + '` ON ' + j.on;
    }

    // Order by primary key
    query += ' ORDER BY `' + tableName + '`.`' + def.pk[0] + '` ASC';

    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching ' + tableName + ':', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/:table/:id - Returns a single row by its primary key
app.get('/api/:table/:id', async (req, res) => {
  const def = getTableDef(req.params.table);
  if (!def) return res.status(400).json({ error: 'Invalid table name' });

  try {
    // Split composite keys (e.g. "1,2" for tables with two PKs)
    const ids = req.params.id.split(',');
    const where = def.pk.map(k => '`' + k + '` = ?').join(' AND ');

    const [rows] = await pool.query(
      'SELECT * FROM `' + req.params.table + '` WHERE ' + where, ids
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/query - Run a raw SQL query (for the SQL console)
// This lets us run any of the 11 required queries during the demo
// IMPORTANT: This route must be defined BEFORE /api/:table
// otherwise Express matches "query" as a table name parameter
app.post('/api/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim()) {
    return res.status(400).json({ error: 'No SQL provided' });
  }

  try {
    const [rows, fields] = await pool.query(sql);
    // For SELECT queries, rows is an array of results
    // For INSERT/UPDATE/DELETE, rows is a ResultSetHeader
    if (Array.isArray(rows)) {
      res.json({
        columns: fields.map(f => f.name),
        rows: rows,
        rowCount: rows.length
      });
    } else {
      res.json({
        message: `Query OK. Affected rows: ${rows.affectedRows}`,
        affectedRows: rows.affectedRows
      });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/:table - Insert a new row
// All user input goes through parameterized queries (?) to prevent SQL injection
app.post('/api/:table', async (req, res) => {
  const tableName = req.params.table;
  const def = getTableDef(tableName);
  if (!def) return res.status(400).json({ error: 'Invalid table name' });

  try {
    const data = req.body;

    // Only accept columns that exist in our table definition (security)
    const cols = def.columns.filter(c => {
      // Skip auto-increment column if not provided
      if (c === def.autoIncrement && !data[c]) return false;
      return data[c] !== undefined;
    });

    // Convert empty strings to null for optional fields
    const vals = cols.map(c => data[c] === '' ? null : data[c]);
    const placeholders = cols.map(() => '?').join(', ');
    const colNames = cols.map(c => '`' + c + '`').join(', ');

    const [result] = await pool.query(
      'INSERT INTO `' + tableName + '` (' + colNames + ') VALUES (' + placeholders + ')', vals
    );

    res.json({ success: true, insertId: result.insertId || data[def.pk[0]] });
  } catch (err) {
    console.error('Error inserting into ' + tableName + ':', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/:table/:id - Update an existing row
// Uses parameterized queries for security
app.put('/api/:table/:id', async (req, res) => {
  const tableName = req.params.table;
  const def = getTableDef(tableName);
  if (!def) return res.status(400).json({ error: 'Invalid table name' });

  try {
    const data = req.body;
    const ids = req.params.id.split(',');

    // Only update non-PK columns that were provided in the request
    const updateCols = def.columns.filter(c => !def.pk.includes(c) && data[c] !== undefined);
    if (updateCols.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = updateCols.map(c => '`' + c + '` = ?').join(', ');
    const vals = updateCols.map(c => data[c] === '' ? null : data[c]);
    const where = def.pk.map(k => '`' + k + '` = ?').join(' AND ');

    await pool.query(
      'UPDATE `' + tableName + '` SET ' + setClause + ' WHERE ' + where,
      [...vals, ...ids]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating ' + tableName + ':', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/:table/:id - Delete a row by primary key
app.delete('/api/:table/:id', async (req, res) => {
  const tableName = req.params.table;
  const def = getTableDef(tableName);
  if (!def) return res.status(400).json({ error: 'Invalid table name' });

  try {
    const ids = req.params.id.split(',');
    const where = def.pk.map(k => '`' + k + '` = ?').join(' AND ');

    await pool.query(
      'DELETE FROM `' + tableName + '` WHERE ' + where, ids
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting from ' + tableName + ':', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================
// START THE SERVER
// =============================================================
// 1. Open SSH tunnel (one time)
// 2. Create MySQL pool (one time, reused for all requests)
// 3. Test the connection
// 4. Start listening for HTTP requests
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Step 1 & 2: create tunnel and pool (done once)
    await createSSHTunnel();

    // Step 3: verify the connection works
    await pool.query('SELECT 1');
    console.log('MySQL connection verified');

    // Step 4: start the server
    app.listen(PORT, () => {
      console.log('Server running at http://localhost:' + PORT);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    console.log('Make sure your .env file has the correct credentials.');
    process.exit(1);
  }
}

// Clean up connections when the server is stopped (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (pool) pool.end();
  if (localServer) localServer.close();
  if (sshClient) sshClient.end();
  process.exit(0);
});

start();
