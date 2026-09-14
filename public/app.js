// app.js - Frontend logic for the Vehicle Management System
// Handles all CRUD operations, table rendering, modals, and search.

// =============================================================
// STATE VARIABLES
// =============================================================
// These keep track of what the user is currently viewing/editing

var schema = {};            // table schema info from the server
var currentTable = 'Customer'; // which table is selected
var currentData = [];       // the rows currently displayed
var editingId = null;       // the PK of the row being edited (null if adding)

// =============================================================
// TABLE CONFIGURATION
// =============================================================
// For each table, we define:
// - label: the display name
// - displayCols: which columns to show in the table
// - colLabels: human-friendly column headers
// - formFields: fields shown in the add/edit form

var TABLE_CONFIG = {
  Customer: {
    label: 'Customers',
    displayCols: ['Id_Customer', 'Type_Customer', 'Address_Customer', 'Phone_Customer'],
    colLabels: { Id_Customer: 'ID', Type_Customer: 'Type', Address_Customer: 'Address', Phone_Customer: 'Phone' },
    formFields: [
      { col: 'Type_Customer', label: 'Type', type: 'select', options: [{ value: 'E', label: 'Enterprise' }, { value: 'I', label: 'Individual' }], required: true },
      { col: 'Address_Customer', label: 'Address', type: 'text', required: true },
      { col: 'Phone_Customer', label: 'Phone', type: 'text', required: true }
    ]
  },
  Entreprise: {
    label: 'Enterprises',
    displayCols: ['Id_Customer', 'Business_Name', 'Address_Customer'],
    colLabels: { Id_Customer: 'Customer ID', Business_Name: 'Business Name', Address_Customer: 'Address' },
    formFields: [
      { col: 'Id_Customer', label: 'Customer ID', type: 'fk', fkTable: 'Customer', fkFilter: { Type_Customer: 'E' }, fkLabel: function(r) { return r.Id_Customer + ' - ' + r.Phone_Customer; }, required: true },
      { col: 'Business_Name', label: 'Business Name', type: 'text', required: true }
    ]
  },
  Individual: {
    label: 'Individuals',
    displayCols: ['Id_Customer', 'First_Name', 'Last_Name', 'Address_Customer'],
    colLabels: { Id_Customer: 'Customer ID', First_Name: 'First Name', Last_Name: 'Last Name', Address_Customer: 'Address' },
    formFields: [
      { col: 'Id_Customer', label: 'Customer ID', type: 'fk', fkTable: 'Customer', fkFilter: { Type_Customer: 'I' }, fkLabel: function(r) { return r.Id_Customer + ' - ' + r.Phone_Customer; }, required: true },
      { col: 'First_Name', label: 'First Name', type: 'text', required: true },
      { col: 'Last_Name', label: 'Last Name', type: 'text', required: true }
    ]
  },
  Reservation: {
    label: 'Reservations',
    displayCols: ['Id_Reservation', 'Date_Reservation', 'Status_Reservation', 'Id_Customer', 'Phone_Customer'],
    colLabels: { Id_Reservation: 'ID', Date_Reservation: 'Date', Status_Reservation: 'Status', Id_Customer: 'Customer', Phone_Customer: 'Phone' },
    formFields: [
      { col: 'Date_Reservation', label: 'Date', type: 'date', required: true },
      { col: 'Status_Reservation', label: 'Status', type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Modified', label: 'Modified' }, { value: 'Cancelled', label: 'Cancelled' }], required: true },
      { col: 'Id_Customer', label: 'Customer', type: 'fk', fkTable: 'Customer', fkLabel: function(r) { return r.Id_Customer + ' - ' + r.Phone_Customer; }, required: true }
    ]
  },
  Garage: {
    label: 'Garages',
    displayCols: ['Id_Garage', 'Location_Garage'],
    colLabels: { Id_Garage: 'ID', Location_Garage: 'Location' },
    formFields: [
      { col: 'Location_Garage', label: 'Location', type: 'text', required: true }
    ]
  },
  Driver: {
    label: 'Drivers',
    displayCols: ['Id_Driver', 'First_Name_Driver', 'Last_Name_Driver'],
    colLabels: { Id_Driver: 'ID', First_Name_Driver: 'First Name', Last_Name_Driver: 'Last Name' },
    formFields: [
      { col: 'Id_Driver', label: 'Driver ID', type: 'number', required: true },
      { col: 'First_Name_Driver', label: 'First Name', type: 'text', required: true },
      { col: 'Last_Name_Driver', label: 'Last Name', type: 'text', required: true }
    ]
  },
  License: {
    label: 'Licenses',
    displayCols: ['Id_License', 'Name_License'],
    colLabels: { Id_License: 'ID', Name_License: 'Name' },
    formFields: [
      { col: 'Name_License', label: 'License Name', type: 'text', required: true }
    ]
  },
  Driver_License: {
    label: 'Driver Licenses',
    displayCols: ['Id_License', 'Name_License', 'Id_Driver', 'First_Name_Driver', 'Last_Name_Driver'],
    colLabels: { Id_License: 'License', Name_License: 'License Name', Id_Driver: 'Driver', First_Name_Driver: 'First Name', Last_Name_Driver: 'Last Name' },
    formFields: [
      { col: 'Id_License', label: 'License', type: 'fk', fkTable: 'License', fkLabel: function(r) { return r.Id_License + ' - ' + r.Name_License; }, required: true },
      { col: 'Id_Driver', label: 'Driver', type: 'fk', fkTable: 'Driver', fkLabel: function(r) { return r.Id_Driver + ' - ' + r.First_Name_Driver + ' ' + r.Last_Name_Driver; }, required: true }
    ]
  },
  Vehicle: {
    label: 'Vehicles',
    displayCols: ['Id_Vehicle', 'Plate_Vehicle', 'Brand_Vehicle', 'Category_Vehicle', 'Rate_Per_Hour', 'Rate_Per_Km', 'Name_License'],
    colLabels: { Id_Vehicle: 'ID', Plate_Vehicle: 'Plate', Brand_Vehicle: 'Brand', Category_Vehicle: 'Category', Rate_Per_Hour: '$/hr', Rate_Per_Km: '$/km', Name_License: 'License' },
    formFields: [
      { col: 'Plate_Vehicle', label: 'Plate', type: 'text', required: true },
      { col: 'Brand_Vehicle', label: 'Brand', type: 'text', required: true },
      { col: 'Category_Vehicle', label: 'Category', type: 'select', options: [{ value: 'T', label: 'Tourism' }, { value: 'H', label: 'Heavy' }, { value: 'S', label: 'Super Heavy' }], required: true },
      { col: 'Rate_Per_Hour', label: 'Rate/Hour ($)', type: 'number', step: '0.01', required: true },
      { col: 'Rate_Per_Km', label: 'Rate/Km ($)', type: 'number', step: '0.01', required: true },
      { col: 'Id_License', label: 'License', type: 'fk', fkTable: 'License', fkLabel: function(r) { return r.Id_License + ' - ' + r.Name_License; }, required: true }
    ]
  },
  Mission: {
    label: 'Missions',
    displayCols: ['Id_Mission', 'Status_Mission', 'Location_Mission', 'First_Name_Driver', 'Plate_Vehicle', 'Planned_Start_Datetime', 'Planned_End_Time', 'Expected_Duration'],
    colLabels: { Id_Mission: 'ID', Status_Mission: 'Status', Location_Mission: 'Location', First_Name_Driver: 'Driver', Plate_Vehicle: 'Vehicle', Planned_Start_Datetime: 'Start', Planned_End_Time: 'End', Expected_Duration: 'Dur (h)' },
    formFields: [
      { col: 'Id_Reservation', label: 'Reservation', type: 'fk', fkTable: 'Reservation', fkLabel: function(r) { return r.Id_Reservation + ' - ' + r.Date_Reservation; }, required: true },
      { col: 'Id_Driver', label: 'Driver', type: 'fk', fkTable: 'Driver', fkLabel: function(r) { return r.Id_Driver + ' - ' + r.First_Name_Driver + ' ' + r.Last_Name_Driver; }, required: true },
      { col: 'Id_Vehicle', label: 'Vehicle', type: 'fk', fkTable: 'Vehicle', fkLabel: function(r) { return r.Id_Vehicle + ' - ' + r.Plate_Vehicle; }, required: true },
      { col: 'Id_Garage_Dep', label: 'Departure Garage', type: 'fk', fkTable: 'Garage', fkLabel: function(r) { return r.Id_Garage + ' - ' + r.Location_Garage; }, required: true },
      { col: 'Id_Garage_Ret', label: 'Return Garage', type: 'fk', fkTable: 'Garage', fkLabel: function(r) { return r.Id_Garage + ' - ' + r.Location_Garage; }, required: true },
      { col: 'Location_Mission', label: 'Location', type: 'text', required: true },
      { col: 'Desired_Vehicle_Type', label: 'Vehicle Type', type: 'select', options: [{ value: 'T', label: 'Tourism' }, { value: 'H', label: 'Heavy' }, { value: 'S', label: 'Super Heavy' }], required: true },
      { col: 'Appointment_Datetime', label: 'Appointment', type: 'datetime-local', required: true },
      { col: 'Planned_Start_Datetime', label: 'Planned Start', type: 'datetime-local', required: true },
      { col: 'Planned_End_Time', label: 'Planned End', type: 'datetime-local', required: true },
      { col: 'Actual_Start_time', label: 'Actual Start', type: 'datetime-local', required: false },
      { col: 'Actual_End_Time', label: 'Actual End', type: 'datetime-local', required: false },
      { col: 'Odo_Before', label: 'Odo Before', type: 'number', required: false },
      { col: 'Odo_After', label: 'Odo After', type: 'number', required: false },
      { col: 'Week_Published', label: 'Week Published', type: 'number', required: true },
      { col: 'Status_Mission', label: 'Status', type: 'select', options: [{ value: 'Planned', label: 'Planned' }, { value: 'Ongoing', label: 'Ongoing' }, { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' }], required: true },
      { col: 'Expected_Duration', label: 'Duration (hrs)', type: 'number', required: true }
    ]
  },
  Tax_Rate: {
    label: 'Tax Rates',
    displayCols: ['Id_Tax', 'Name_Tax', 'Percentage_Tax'],
    colLabels: { Id_Tax: 'ID', Name_Tax: 'Name', Percentage_Tax: 'Rate (%)' },
    formFields: [
      { col: 'Name_Tax', label: 'Tax Name', type: 'text', required: true },
      { col: 'Percentage_Tax', label: 'Rate (%)', type: 'number', step: '0.01', required: true }
    ]
  },
  Invoice: {
    label: 'Invoices',
    displayCols: ['Id_Invoice', 'Date_Invoice', 'Week_Number', 'Status_Invoice', 'Id_Customer', 'Name_Tax'],
    colLabels: { Id_Invoice: 'ID', Date_Invoice: 'Date', Week_Number: 'Week', Status_Invoice: 'Status', Id_Customer: 'Customer', Name_Tax: 'Tax' },
    formFields: [
      { col: 'Date_Invoice', label: 'Date', type: 'date', required: true },
      { col: 'Week_Number', label: 'Week', type: 'number', required: true },
      { col: 'Status_Invoice', label: 'Status', type: 'select', options: [{ value: 'Pending', label: 'Pending' }, { value: 'Paid', label: 'Paid' }, { value: 'Overdue', label: 'Overdue' }], required: true },
      { col: 'Id_Customer', label: 'Customer', type: 'fk', fkTable: 'Customer', fkLabel: function(r) { return r.Id_Customer + ' - ' + r.Phone_Customer; }, required: true },
      { col: 'Id_Tax', label: 'Tax Rate', type: 'fk', fkTable: 'Tax_Rate', fkLabel: function(r) { return r.Id_Tax + ' - ' + r.Name_Tax + ' (' + r.Percentage_Tax + '%)'; }, required: true }
    ]
  },
  Invoice_Line: {
    label: 'Invoice Lines',
    displayCols: ['Id_Invoice', 'Id_Mission', 'Duration_Cost', 'Km_Cost', 'Line_Total', 'Location_Mission'],
    colLabels: { Id_Invoice: 'Invoice', Id_Mission: 'Mission', Duration_Cost: 'Dur Cost', Km_Cost: 'Km Cost', Line_Total: 'Total', Location_Mission: 'Location' },
    formFields: [
      { col: 'Id_Invoice', label: 'Invoice', type: 'fk', fkTable: 'Invoice', fkLabel: function(r) { return r.Id_Invoice + ' - ' + r.Date_Invoice; }, required: true },
      { col: 'Id_Mission', label: 'Mission', type: 'fk', fkTable: 'Mission', fkLabel: function(r) { return r.Id_Mission + ' - ' + r.Location_Mission; }, required: true },
      { col: 'Duration_Cost', label: 'Duration Cost ($)', type: 'number', step: '0.01', required: false },
      { col: 'Km_Cost', label: 'Km Cost ($)', type: 'number', step: '0.01', required: false },
      { col: 'Line_Total', label: 'Total ($)', type: 'number', step: '0.01', required: false }
    ]
  },
  Payment: {
    label: 'Payments',
    displayCols: ['Id_Payment', 'Pay_Date', 'Method', 'Amount', 'Id_Invoice', 'Status_Invoice'],
    colLabels: { Id_Payment: 'ID', Pay_Date: 'Date', Method: 'Method', Amount: 'Amount', Id_Invoice: 'Invoice', Status_Invoice: 'Inv Status' },
    formFields: [
      { col: 'Pay_Date', label: 'Date', type: 'date', required: true },
      { col: 'Method', label: 'Method', type: 'select', options: [{ value: 'credit', label: 'Credit' }, { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }], required: true },
      { col: 'Amount', label: 'Amount ($)', type: 'number', step: '0.01', required: true },
      { col: 'Id_Invoice', label: 'Invoice', type: 'fk', fkTable: 'Invoice', fkLabel: function(r) { return r.Id_Invoice + ' - ' + r.Date_Invoice; }, required: true }
    ]
  }
};

// =============================================================
// DATABASE CONSTRAINTS
// =============================================================
// These are the CHECK constraints and rules from our SQL schema.
// They show up as hints under each form field so the user knows
// what values are allowed before submitting.

var CONSTRAINTS = {
  Customer: {
    Type_Customer: "Must be 'E' (Enterprise) or 'I' (Individual)",
    Address_Customer: "NOT NULL, max 200 characters",
    Phone_Customer: "NOT NULL, UNIQUE, max 20 characters"
  },
  Entreprise: {
    Id_Customer: "FK → Customer(Id_Customer), must be type 'E'",
    Business_Name: "NOT NULL, max 100 characters"
  },
  Individual: {
    Id_Customer: "FK → Customer(Id_Customer), must be type 'I'",
    First_Name: "NOT NULL, max 80 characters",
    Last_Name: "NOT NULL, max 80 characters"
  },
  Reservation: {
    Date_Reservation: "NOT NULL, format: YYYY-MM-DD",
    Status_Reservation: "Must be 'Active', 'Modified', or 'Cancelled'",
    Id_Customer: "FK → Customer(Id_Customer)"
  },
  Garage: {
    Location_Garage: "NOT NULL, max 200 characters"
  },
  Driver: {
    Id_Driver: "NOT NULL, must be a unique integer (not auto-increment)",
    First_Name_Driver: "NOT NULL, max 80 characters",
    Last_Name_Driver: "NOT NULL, max 80 characters"
  },
  License: {
    Name_License: "NOT NULL, max 80 characters"
  },
  Driver_License: {
    Id_License: "FK → License(Id_License), part of composite PK",
    Id_Driver: "FK → Driver(Id_Driver), part of composite PK"
  },
  Vehicle: {
    Plate_Vehicle: "NOT NULL, UNIQUE, max 20 characters",
    Brand_Vehicle: "NOT NULL, max 60 characters",
    Category_Vehicle: "Must be 'T' (Tourism), 'H' (Heavy), or 'S' (Super Heavy)",
    Rate_Per_Hour: "CHECK: must be > 0",
    Rate_Per_Km: "CHECK: must be > 0",
    Id_License: "FK → License(Id_License)"
  },
  Mission: {
    Id_Reservation: "FK → Reservation(Id_Reservation)",
    Id_Driver: "FK → Driver(Id_Driver)",
    Id_Vehicle: "FK → Vehicle(Id_Vehicle)",
    Id_Garage_Dep: "FK → Garage(Id_Garage), departure garage",
    Id_Garage_Ret: "FK → Garage(Id_Garage), return garage",
    Location_Mission: "NOT NULL, max 200 characters",
    Desired_Vehicle_Type: "Must be 'T', 'H', or 'S'",
    Appointment_Datetime: "NOT NULL, format: YYYY-MM-DD HH:MM",
    Planned_Start_Datetime: "NOT NULL, format: YYYY-MM-DD HH:MM",
    Planned_End_Time: "NOT NULL, format: YYYY-MM-DD HH:MM",
    Actual_Start_time: "Optional, format: YYYY-MM-DD HH:MM",
    Actual_End_Time: "Optional, format: YYYY-MM-DD HH:MM",
    Odo_Before: "CHECK: must be >= 0",
    Odo_After: "CHECK: must be >= 0 and >= Odo_Before",
    Week_Published: "CHECK: must be between 1 and 52",
    Status_Mission: "Must be 'Planned', 'Ongoing', 'Completed', or 'Cancelled'",
    Expected_Duration: "CHECK: must be > 0 and <= 120 (hours)"
  },
  Tax_Rate: {
    Name_Tax: "NOT NULL, max 80 characters",
    Percentage_Tax: "CHECK: must be >= 0"
  },
  Invoice: {
    Date_Invoice: "NOT NULL, format: YYYY-MM-DD",
    Week_Number: "CHECK: must be between 1 and 52",
    Status_Invoice: "Must be 'Pending', 'Paid', or 'Overdue'",
    Id_Customer: "FK → Customer(Id_Customer)",
    Id_Tax: "FK → Tax_Rate(Id_Tax)"
  },
  Invoice_Line: {
    Id_Invoice: "FK → Invoice(Id_Invoice), part of composite PK",
    Id_Mission: "FK → Mission(Id_Mission), part of composite PK",
    Duration_Cost: "CHECK: must be >= 0",
    Km_Cost: "CHECK: must be >= 0",
    Line_Total: "CHECK: must be >= 0"
  },
  Payment: {
    Pay_Date: "NOT NULL, format: YYYY-MM-DD",
    Method: "Must be 'credit', 'cash', or 'cheque'",
    Amount: "CHECK: must be >= 0",
    Id_Invoice: "FK → Invoice(Id_Invoice)"
  }
};

// =============================================================
// DOM REFERENCES
// =============================================================
// Get references to HTML elements we need to manipulate

var pageTitle = document.getElementById('page-title');
var recordCount = document.getElementById('record-count');
var searchInput = document.getElementById('search-input');
var btnAdd = document.getElementById('btn-add');
var tableHead = document.getElementById('table-head');
var tableBody = document.getElementById('table-body');
var tableWrapper = document.getElementById('table-wrapper');
var loading = document.getElementById('loading');
var emptyState = document.getElementById('empty-state');
var modalOverlay = document.getElementById('modal-overlay');
var modalTitle = document.getElementById('modal-title');
var modalFields = document.getElementById('modal-fields');
var modalForm = document.getElementById('modal-form');
var deleteOverlay = document.getElementById('delete-overlay');
var toastContainer = document.getElementById('toast-container');

// =============================================================
// API FUNCTIONS
// =============================================================
// These functions communicate with the server using fetch.
// Each one corresponds to a CRUD operation.

var API = {
  // GET all rows from a table
  get: async function(table) {
    var res = await fetch('/api/' + table);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // GET rows for populating dropdown options
  getOptions: async function(table) {
    var res = await fetch('/api/options/' + table);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // POST - create a new row
  create: async function(table, data) {
    var res = await fetch('/api/' + table, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      var err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  },

  // PUT - update an existing row
  update: async function(table, id, data) {
    var res = await fetch('/api/' + table + '/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      var err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  },

  // DELETE - remove a row
  del: async function(table, id) {
    var res = await fetch('/api/' + table + '/' + id, { method: 'DELETE' });
    if (!res.ok) {
      var err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  },

  // GET the table schema info
  schema: async function() {
    var res = await fetch('/api/schema');
    return res.json();
  }
};

// =============================================================
// TOAST NOTIFICATIONS
// =============================================================
// Shows a small message at the bottom right of the screen
// that disappears after 3 seconds

function toast(msg, isError) {
  var d = document.createElement('div');
  d.className = 'toast' + (isError ? ' error' : '');
  d.textContent = msg;
  toastContainer.appendChild(d);
  setTimeout(function() { d.remove(); }, 3000);
}

// =============================================================
// FORMATTING HELPERS
// =============================================================
// These help display data in a readable way in the table

// Returns a colored badge for status values
function badge(val) {
  var colors = {
    Active: 'green', Completed: 'green', Paid: 'green',
    Planned: 'blue', Pending: 'blue',
    Modified: 'yellow', Ongoing: 'yellow',
    Cancelled: 'red', Overdue: 'red'
  };
  return '<span class="badge badge-' + (colors[val] || 'gray') + '">' + val + '</span>';
}

// Check if a column contains status data
function isStatusColumn(col) {
  return col === 'Status_Reservation' || col === 'Status_Mission' || col === 'Status_Invoice';
}

// Format a cell value for display
function formatCell(col, val) {
  // Handle null values
  if (val === null || val === undefined) return '-';

  // Show badges for status columns
  if (isStatusColumn(col)) return badge(val);

  // Show customer type as badge
  if (col === 'Type_Customer') {
    return val === 'E' ? '<span class="badge badge-blue">E</span>' : '<span class="badge badge-gray">I</span>';
  }

  // Show vehicle category names instead of codes
  if (col === 'Category_Vehicle' || col === 'Desired_Vehicle_Type') {
    var categories = { T: 'Tourism', H: 'Heavy', S: 'Super Heavy' };
    return categories[val] || val;
  }

  // Format money columns with dollar sign
  if (['Rate_Per_Hour', 'Rate_Per_Km', 'Duration_Cost', 'Km_Cost', 'Line_Total', 'Amount'].indexOf(col) !== -1) {
    return '$' + parseFloat(val).toFixed(2);
  }

  // Format percentage
  if (col === 'Percentage_Tax') return parseFloat(val).toFixed(2) + '%';

  // Format datetime strings to be more readable
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/)) {
    return val.replace('T', ' ').substring(0, 16);
  }

  return val;
}

// =============================================================
// TABLE LOADING AND RENDERING
// =============================================================

// Load data from the server and display it in the table
async function loadTable(name) {
  currentTable = name;
  var cfg = TABLE_CONFIG[name];
  pageTitle.textContent = cfg.label;

  // Update the active link in the sidebar
  document.querySelectorAll('.nav-link').forEach(function(l) {
    l.classList.remove('active');
  });
  document.querySelector('[data-table="' + name + '"]').classList.add('active');

  // Show loading state
  loading.style.display = '';
  tableWrapper.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    // Fetch data from the server
    currentData = await API.get(name);
    render();
  } catch (e) {
    toast('Failed to load: ' + e.message, true);
    currentData = [];
    render();
  } finally {
    loading.style.display = 'none';
  }
}

// Render the current data into the HTML table
function render() {
  var cfg = TABLE_CONFIG[currentTable];
  var cols = cfg.displayCols;

  // Filter data by search query
  var query = searchInput.value.toLowerCase();
  var data = currentData;
  if (query) {
    data = data.filter(function(row) {
      return cols.some(function(c) {
        return row[c] != null && String(row[c]).toLowerCase().indexOf(query) !== -1;
      });
    });
  }

  // Update record count
  recordCount.textContent = data.length + ' record' + (data.length !== 1 ? 's' : '');

  // Build table header
  tableHead.innerHTML = '<tr>' +
    cols.map(function(c) { return '<th>' + (cfg.colLabels[c] || c) + '</th>'; }).join('') +
    '<th>Actions</th></tr>';

  // Handle empty state
  if (data.length === 0) {
    tableWrapper.style.display = 'none';
    emptyState.style.display = '';
    return;
  }

  tableWrapper.style.display = '';
  emptyState.style.display = 'none';

  // Get primary key columns for building edit/delete links
  var pk = schema[currentTable] ? schema[currentTable].pk : [];

  // Build table rows
  tableBody.innerHTML = data.map(function(row) {
    var id = pk.map(function(k) { return row[k]; }).join(',');
    return '<tr>' +
      cols.map(function(c) { return '<td>' + formatCell(c, row[c]) + '</td>'; }).join('') +
      '<td><div class="actions">' +
        '<button onclick="openEdit(\'' + id + '\')">Edit</button>' +
        '<button class="del" onclick="openDelete(\'' + id + '\')">Del</button>' +
      '</div></td></tr>';
  }).join('');
}

// =============================================================
// MODAL (ADD / EDIT FORM)
// =============================================================

// Open the modal form for adding or editing a record
async function openModal(mode, data) {
  data = data || {};
  var cfg = TABLE_CONFIG[currentTable];

  // Set editingId if we're editing an existing record
  editingId = mode === 'edit' ? schema[currentTable].pk.map(function(k) { return data[k]; }).join(',') : null;
  modalTitle.textContent = (mode === 'edit' ? 'Edit ' : 'Add ') + cfg.label.replace(/s$/, '');

  // Build form fields
  var html = '';
  for (var i = 0; i < cfg.formFields.length; i++) {
    var f = cfg.formFields[i];
    var val = data[f.col] !== undefined ? data[f.col] : '';
    var dis = mode === 'edit' && schema[currentTable].pk.indexOf(f.col) !== -1 ? 'disabled' : '';
    var req = f.required ? 'required' : '';

    html += '<div class="form-group"><label>' + f.label + (f.required ? ' *' : '') + '</label>';

    if (f.type === 'select') {
      // Dropdown with predefined options
      html += '<select name="' + f.col + '" ' + dis + ' ' + req + '><option value="">Select...</option>';
      for (var j = 0; j < f.options.length; j++) {
        var o = f.options[j];
        html += '<option value="' + o.value + '"' + (val == o.value ? ' selected' : '') + '>' + o.label + '</option>';
      }
      html += '</select>';
    } else if (f.type === 'fk') {
      // Foreign key dropdown - options loaded from server
      html += '<select name="' + f.col + '" ' + dis + ' ' + req + ' data-fk="' + f.fkTable + '" data-current="' + val + '"><option value="">Loading...</option></select>';
    } else {
      // Regular input field
      var v = val;
      if (f.type === 'datetime-local' && v) v = String(v).replace(' ', 'T').substring(0, 16);
      html += '<input type="' + f.type + '" name="' + f.col + '" value="' + v + '" ' + dis + ' ' + req + (f.step ? ' step="' + f.step + '"' : '') + '>';
    }

    // Show constraint hint under the field if one exists
    var tableConstraints = CONSTRAINTS[currentTable];
    if (tableConstraints && tableConstraints[f.col]) {
      html += '<span class="hint">' + tableConstraints[f.col] + '</span>';
    }

    html += '</div>';
  }
  modalFields.innerHTML = html;

  // Load foreign key dropdown options from the server
  var fkSelects = modalFields.querySelectorAll('select[data-fk]');
  for (var s = 0; s < fkSelects.length; s++) {
    var sel = fkSelects[s];
    var fkTable = sel.dataset.fk;
    var cur = sel.dataset.current;
    var fd = cfg.formFields.find(function(field) { return field.col === sel.name; });
    try {
      var opts = await API.getOptions(fkTable);
      // Apply filter if needed (e.g. only show Enterprise customers)
      if (fd.fkFilter) {
        opts = opts.filter(function(r) {
          return Object.entries(fd.fkFilter).every(function(entry) { return r[entry[0]] === entry[1]; });
        });
      }
      sel.innerHTML = '<option value="">Select...</option>';
      for (var k = 0; k < opts.length; k++) {
        var r = opts[k];
        var pkCol = schema[fkTable] ? schema[fkTable].pk[0] : Object.keys(r)[0];
        sel.innerHTML += '<option value="' + r[pkCol] + '"' + (cur == r[pkCol] ? ' selected' : '') + '>' + fd.fkLabel(r) + '</option>';
      }
    } catch (e) {
      sel.innerHTML = '<option value="">Error loading</option>';
    }
  }

  // Show the modal
  modalOverlay.classList.add('active');
}

// Close the modal
function closeModal() {
  modalOverlay.classList.remove('active');
  editingId = null;
}

// Handle form submission (create or update)
modalForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  var cfg = TABLE_CONFIG[currentTable];
  var formData = {};

  // Collect form values
  for (var i = 0; i < cfg.formFields.length; i++) {
    var f = cfg.formFields[i];
    var el = modalForm.querySelector('[name="' + f.col + '"]');
    if (el && !el.disabled) formData[f.col] = el.value;
    if (el && el.disabled && !editingId) formData[f.col] = el.value;
  }

  try {
    if (editingId) {
      // Update existing record
      await API.update(currentTable, editingId, formData);
      toast('Updated successfully');
    } else {
      // Create new record
      await API.create(currentTable, formData);
      toast('Created successfully');
    }
    closeModal();
    loadTable(currentTable); // Refresh the table
  } catch (e) {
    toast(e.message, true);
  }
});

// =============================================================
// DELETE CONFIRMATION
// =============================================================

var deleteTarget = null; // ID of the record to delete

// Show the delete confirmation modal
function openDelete(id) {
  deleteTarget = id;
  deleteOverlay.classList.add('active');
}

// Close the delete modal
function closeDelete() {
  deleteOverlay.classList.remove('active');
  deleteTarget = null;
}

// Handle delete confirmation
document.getElementById('delete-confirm').addEventListener('click', async function() {
  if (!deleteTarget) return;
  try {
    await API.del(currentTable, deleteTarget);
    toast('Deleted successfully');
    closeDelete();
    loadTable(currentTable); // Refresh the table
  } catch (e) {
    toast('Delete failed: ' + e.message, true);
    closeDelete();
  }
});

// Open edit modal for a specific row
function openEdit(id) {
  var parts = id.split(',');
  var pk = schema[currentTable].pk;
  // Find the row in our cached data
  var row = currentData.find(function(r) {
    return pk.every(function(k, i) { return String(r[k]) === parts[i]; });
  });
  if (row) openModal('edit', row);
}

// =============================================================
// EVENT LISTENERS
// =============================================================

// Sidebar navigation - switch between tables
document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    if (this.dataset.table) {
      loadTable(this.dataset.table);
      searchInput.value = ''; // Clear search when switching tables
    }
  });
});

// Add button - open empty form
btnAdd.addEventListener('click', function() { openModal('add'); });

// Search input - filter table as you type
searchInput.addEventListener('input', render);

// Modal close buttons
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) closeModal(); });

// Delete modal close buttons
document.getElementById('delete-close').addEventListener('click', closeDelete);
document.getElementById('delete-cancel').addEventListener('click', closeDelete);
deleteOverlay.addEventListener('click', function(e) { if (e.target === deleteOverlay) closeDelete(); });

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeModal();
    closeDelete();
  }
});

// =============================================================
// INITIALIZATION
// =============================================================
// Load the schema once at startup, then show the Customer table

async function init() {
  try {
    schema = await API.schema(); // Only fetched once
    loadTable('Customer');       // Show customers by default
  } catch (e) {
    toast('Cannot connect to server. Run: npm start', true);
  }
}

init();

// =============================================================
// SQL CONSOLE
// =============================================================

var sqlView = document.getElementById('sql-view');
var tableView = document.getElementById('table-view');
var tableTopbarActions = document.getElementById('table-topbar-actions');
var sqlInput = document.getElementById('sql-input');
var sqlRunBtn = document.getElementById('sql-run');
var sqlError = document.getElementById('sql-error');
var sqlMessage = document.getElementById('sql-message');
var sqlResults = document.getElementById('sql-results');
var sqlThead = document.getElementById('sql-thead');
var sqlTbody = document.getElementById('sql-tbody');
var sqlRowCount = document.getElementById('sql-row-count');
var sqlStatus = document.getElementById('sql-status');
var navSqlConsole = document.getElementById('nav-sql-console');

// Switch to SQL Console view
function showSqlConsole() {
  tableView.style.display = 'none';
  sqlView.style.display = '';
  tableTopbarActions.style.display = 'none';
  pageTitle.textContent = 'SQL Console';

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(function(l) {
    l.classList.remove('active');
  });
  navSqlConsole.classList.add('active');
}

// Switch back to table view
function showTableView() {
  sqlView.style.display = 'none';
  tableView.style.display = '';
  tableTopbarActions.style.display = '';
}

// Handle clicking the SQL Console nav link
navSqlConsole.addEventListener('click', function(e) {
  e.preventDefault();
  showSqlConsole();
});

// Override loadTable to also switch back to table view
var originalLoadTable = loadTable;
loadTable = async function(name) {
  showTableView();
  await originalLoadTable(name);
};

// Run the SQL query
async function runQuery() {
  var sql = sqlInput.value.trim();
  if (!sql) return;

  // Reset results
  sqlError.style.display = 'none';
  sqlMessage.style.display = 'none';
  sqlResults.style.display = 'none';
  sqlStatus.textContent = 'Running...';
  sqlRunBtn.disabled = true;

  try {
    var res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: sql })
    });
    var data = await res.json();

    if (!res.ok) {
      sqlError.textContent = data.error;
      sqlError.style.display = '';
      sqlStatus.textContent = 'Error';
      return;
    }

    // Non-SELECT query (INSERT, UPDATE, DELETE)
    if (data.message) {
      sqlMessage.textContent = data.message;
      sqlMessage.style.display = '';
      sqlStatus.textContent = 'Done';
      return;
    }

    // SELECT query with results
    if (data.columns && data.rows) {
      sqlRowCount.textContent = data.rowCount + ' row' + (data.rowCount !== 1 ? 's' : '') + ' returned';

      // Build header
      sqlThead.innerHTML = '<tr>' +
        data.columns.map(function(c) { return '<th>' + c + '</th>'; }).join('') +
        '</tr>';

      // Build rows
      if (data.rows.length === 0) {
        sqlTbody.innerHTML = '<tr><td colspan="' + data.columns.length + '" style="text-align:center;color:#999;padding:20px;">No rows returned</td></tr>';
      } else {
        sqlTbody.innerHTML = data.rows.map(function(row) {
          return '<tr>' +
            data.columns.map(function(c) {
              var val = row[c];
              if (val === null || val === undefined) return '<td style="color:#999;">NULL</td>';
              return '<td>' + String(val).replace(/</g, '&lt;') + '</td>';
            }).join('') +
            '</tr>';
        }).join('');
      }

      sqlResults.style.display = '';
      sqlStatus.textContent = 'Done — ' + data.rowCount + ' rows';
    }
  } catch (e) {
    sqlError.textContent = 'Network error: ' + e.message;
    sqlError.style.display = '';
    sqlStatus.textContent = 'Error';
  } finally {
    sqlRunBtn.disabled = false;
  }
}

// Run button click
sqlRunBtn.addEventListener('click', runQuery);

// Ctrl+Enter or Cmd+Enter to run
sqlInput.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runQuery();
  }
});

// =============================================================
// SQL HINTS (toggle + click to load)
// =============================================================

var sqlHintsToggle = document.getElementById('sql-hints-toggle');
var sqlHintsBody = document.getElementById('sql-hints-body');
var sqlHintsArrow = document.getElementById('sql-hints-arrow');

// Toggle hints panel open/closed
sqlHintsToggle.addEventListener('click', function() {
  if (sqlHintsBody.style.display === 'none') {
    sqlHintsBody.style.display = '';
    sqlHintsArrow.classList.add('open');
  } else {
    sqlHintsBody.style.display = 'none';
    sqlHintsArrow.classList.remove('open');
  }
});

// Click a hint to load it into the textarea and run it
document.querySelectorAll('.sql-hint-item').forEach(function(item) {
  item.addEventListener('click', function() {
    var query = this.getAttribute('data-query');
    if (query) {
      sqlInput.value = query;
      sqlInput.focus();
    }
  });
});
