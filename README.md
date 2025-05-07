# Visitor Management System (VMS)

A comprehensive visitor management solution designed to streamline visitor interactions with advanced administrative controls and real-time insights. This enterprise-grade application provides a modern, secure, and efficient way to register, track, and manage visitors across your organization.

**[View API Documentation](API_DOCUMENTATION.md)** | **[Installation Instructions](#installation)** | **[Features](#key-features)**

## Overview

The Visitor Management System is built to simplify visitor check-in, enhance security, and streamline client reception at organizations. The system provides real-time tracking of visitors, comprehensive reporting, and an intuitive interface for both administrators and front-desk staff.

## Key Features

### Visitor Management
- **Visitor Registration**: Collect visitor information including name, phone, purpose, municipality, year of birth, and gender
- **Check-in/Check-out System**: Streamlined process for visitors entering and leaving the premises
- **Partner Registration**: Track visitors who arrive together with linked visit records
- **Verification System**: Mark visitors as verified with color-coded badges and status indicators
- **Badge Generation**: Generate digital visitor badges with QR codes

### Administrative Dashboard
- **Real-time Visitor Tracking**: See who is currently in the building at a glance
- **Multiple View Options**:
  - Current Visitors: Track who's currently on-site
  - Visit History: Review past visits with detailed information
  - All Visitors: Manage the complete visitor database
- **Filtered Search**: Quickly find visitors by name, phone, check-in date, or purpose
- **Bulk Actions**: Select and check out multiple visitors simultaneously

### Analytics and Reporting
- **Interactive Dashboard**: Visual reports with charts displaying visitor patterns
- **Time-based Analytics**: Track visitor traffic by day, week, or month
- **Visitor Demographics**: Insights on visitor demographics and visit purposes
- **Data Export**: Export reports for further analysis or record-keeping

### System Features
- **Auto-Checkout**: Automatically check out all visitors at midnight
- **Real-time Notifications**: Get alerts for new check-ins via WebSockets
- **Internationalization**: Full support for multiple languages (currently English and French)
- **WhatsApp Integration**: Contact visitors directly through WhatsApp links
- **Responsive Design**: Fully functional on desktop, tablet, and mobile devices
- **Advanced Data Filtering**: Sort and filter visitor data across all views

## Technical Architecture

### Frontend (Client)
- **Framework**: React with TypeScript
- **State Management**: React Query for server state and React Context for application state
- **UI Components**: Custom Shadcn UI components with Tailwind CSS
- **Routing**: Wouter for lightweight routing
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: Custom translation system with language switching

### Backend (Server)
- **Runtime**: Node.js with Express
- **Authentication**: Express sessions with Passport.js
- **Real-time Communication**: WebSockets for live updates
- **API Structure**: RESTful API design with route-specific controllers

### Database
- **Engine**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema**: Strongly typed data models with validation
- **Migrations**: Automatic schema migrations using Drizzle Kit

### Security Features
- **Input Validation**: Comprehensive validation for all user inputs
- **Session Management**: Secure session handling
- **Data Protection**: SQL injection prevention
- **Secure Configuration**: Environment-based security settings

## Setup Instructions

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/username/NL-VMS.git
   cd NL-VMS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/vms_database
   PGHOST=localhost
   PGUSER=your_postgres_username
   PGPASSWORD=your_postgres_password
   PGDATABASE=vms_database
   PGPORT=5432
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

### Production Deployment

For production environments:

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

3. **Consider using a process manager**
   For production deployment, we recommend using PM2 or a similar process manager.

## API Integration

The VMS can be integrated with other systems through its API:

- **REST API**: Connect to external systems via secure API endpoints
- **Authentication**: API key-based authentication for secure access
- **Webhooks**: Configure webhooks for real-time updates to external systems

For detailed API documentation including endpoints, authentication, request/response formats, and Laravel integration examples, see the [API Documentation](API_DOCUMENTATION.md).

## Data Model

The system uses the following core data entities:

- **Visitors**: Individual people who visit the premises
- **Visits**: Records of a visitor's entrance and exit
- **Partners**: Associated visitors who arrive together
- **Users**: System administrators and operators
- **Settings**: Application-wide configuration

## User Roles

- **Administrator**: Complete system access and configuration
- **Front Desk**: Visitor registration and management
- **Security**: Verification and monitoring
- **Analytics**: Reporting and data access

## Support and Maintenance

- Regular updates for security and features
- Data backup and recovery procedures
- Performance optimization recommendations

## License

[License information here]

## Credits

Developed by [Your Organization]
