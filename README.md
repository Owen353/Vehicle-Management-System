Vehicle Management System — Frontend
COMP 353 — Databases

This is a web-based frontend for our project. It lets you view, add, edit, and delete records from all the tables in our MySQL database hosted on Concordia's ENCS servers.

Team Members
James Victor Alvarez
Alexander Hristov
Likun Gu
Joshua Graham
How It Works
The app has two parts:

Backend (server.js) — A Node.js server that connects to the MySQL database and provides an API.
Frontend (public/) — A simple HTML/CSS/JS website that talks to the backend and displays the data.
How the Database Connection Works
Since the MySQL database is hosted on the university's ENCS server, we can't connect to it directly from our laptops. We need to go through SSH first, just like how we normally do it in the terminal:

ssh your_username@login.encs.concordia.ca    (step 1: SSH into ENCS)
mysql -h pwc353.encs.concordia.ca -u pwc353_4 -p pwc353_4  (step 2: connect to MySQL)
Our backend automates this process using an SSH tunnel:

Browser (localhost:3000)
    |
    v
Express Server (our backend)
    |
    v
SSH Tunnel (connects to login.encs.concordia.ca)
    |
    v
MySQL (pwc353.encs.concordia.ca)
The SSH tunnel is created once when the server starts. It stays open the whole time, and all database queries go through it. We use a connection pool (mysql2 library) which reuses database connections instead of opening a new one for every request. This makes it efficient.

Security
Parameterized queries: All user input goes through ? placeholders in SQL, which prevents SQL injection attacks.
Table whitelist: The server only accepts table names that we defined in our code. If someone tries to pass a fake table name, it gets rejected.
Column validation: Only columns that exist in our schema are accepted for inserts and updates.
Credentials in .env: Passwords are stored in a .env file which is not committed to git.
How to Set Up
Prerequisites
Node.js installed on your computer
Your ENCS SSH login credentials
The MySQL credentials (given by Stan)
Step 1: Install Dependencies
Open a terminal in this folder and run:

npm install
This installs the required packages (express, mysql2, ssh2, dotenv, cors).

Step 2: Configure Credentials
Copy the example environment file and fill in your credentials:

cp .env.example .env
Then open .env and fill in:

SSH_USER=your_encs_username
SSH_PASSWORD=your_encs_password
DB_HOST=[...].encs.concordia.ca
DB_PORT=3306
DB_USER=[...]
DB_PASSWORD=[PASSWORD]
DB_NAME=[...]
Step 3: Start the Server
npm start
You should see:

SSH connection established
SSH tunnel open on local port XXXXX
MySQL connection verified
Server running at http://localhost:3000
It can take some time to establish the connection. It can also fail, so try again if it does.

If you see "All configured authentication methods failed", it means your SSH username or password in .env is wrong.

Step 4: Open in Browser
Go to http://localhost:3000 in your browser.

To Stop the Server
Press Ctrl + C in the terminal.

Note: You can't delete a record if other records depend on it (foreign key constraint). For example, you can't delete a Customer if they have Reservations.

Project Structure
Website/
├── server.js          # Backend - Express server, SSH tunnel, REST API
├── package.json       # Node.js project config and dependencies
├── .env               # Your credentials (not in git)
├── .env.example       # Template for credentials
├── .gitignore         # Tells git to ignore node_modules and .env
└── public/
    ├── index.html     # The HTML page (layout, sidebar, modals)
    ├── style.css      # All the styling
    └── app.js         # Frontend logic (CRUD, forms, search)
Database Tables
Table	Description
Customer	All customers (type E=Enterprise, I=Individual)
Entreprise	Enterprise customer details (FK → Customer)
Individual	Individual customer details (FK → Customer)
Reservation	Booking records linked to customers
Mission	Driving missions linked to reservations, drivers, vehicles
Vehicle	Fleet vehicles with rates and license requirements
Driver	Driver records
License	License types (Class T, H, S, etc.)
Driver_License	Links drivers to their licenses (many-to-many)
Garage	Garage locations
Tax_Rate	Tax rates used on invoices
Invoice	Billing invoices linked to customers and tax rates
Invoice_Line	Individual line items on invoices (FK → Invoice, Mission)
Payment	Payments made against invoices
Technologies Used
Node.js — JavaScript runtime for the backend
Express — Web server framework
mysql2 — MySQL database driver (with connection pooling)
ssh2 — SSH client for creating the tunnel to ENCS
dotenv — Loads credentials from .env file
HTML/CSS/JS — Frontend (no frameworks, just vanilla)
