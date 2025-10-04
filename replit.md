# Overview

TechAssets Pro is a comprehensive IT asset management platform designed for small and medium-sized businesses (SMBs). The application helps organizations track, manage, and optimize their IT resources including physical assets, software applications, contracts, licenses, and maintenance records. Built as a full-stack web application, it provides an intuitive dashboard for monitoring costs, generating reports, and maintaining compliance across all IT assets.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with dedicated route handlers
- **Middleware**: Custom logging, error handling, and authentication middleware
- **File Structure**: Monorepo approach with shared schemas between client and server

## Authentication & Authorization
- **Provider**: Email/Password authentication (independent of Replit)
- **Password Security**: bcrypt hashing with 10 salt rounds
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **User Management**: Role-based access control with company-scoped permissions
- **Roles**: Super Admin, Technical Admin, Manager/Owner
- **Session Secret**: Configurable via SESSION_SECRET environment variable (required for production)

## Data Layer
- **Database**: PostgreSQL 15
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Centralized schema definitions in shared directory
- **Migrations**: Drizzle Kit for database schema management
- **Validation**: Zod schemas for runtime type validation

## Database Design
The system uses a multi-tenant architecture with the following core entities:
- **Users**: Authentication and profile management
- **Companies**: Multi-tenancy support with user-company relationships
- **Assets**: Physical devices, applications, and digital resources
- **Contracts**: Vendor agreements and service contracts
- **Licenses**: Software licensing and compliance tracking
- **Maintenance Records**: Service history and scheduled maintenance
- **Activity Log**: Audit trail for all system operations

## Development Workflow
- **Build System**: Vite for frontend, esbuild for backend bundling
- **Type Safety**: Full TypeScript coverage across client, server, and shared code
- **Development Server**: Hot module replacement with Vite dev server
- **Path Aliases**: Configured for clean imports (@/, @shared/)

# External Dependencies

## Database Services
- **PostgreSQL**: Local or remote PostgreSQL 15 server
- **Connection Pooling**: Built-in with Drizzle ORM

## UI and Component Libraries
- **Radix UI**: Headless UI primitives for accessibility and behavior
- **shadcn/ui**: Pre-built component library based on Radix
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Chart library built on D3 for data visualization

## Development Tools
- **Replit Platform**: Development environment with integrated deployment
- **Vite Plugins**: Runtime error overlay and cartographer for enhanced development
- **PostCSS**: CSS processing with Tailwind and Autoprefixer
- **Date-fns**: Date manipulation and formatting library

## Session and Storage
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Memoizee**: Function memoization for performance optimization

## Form and Validation
- **React Hook Form**: Form state management with minimal re-renders
- **Zod**: Schema validation for forms and API data
- **@hookform/resolvers**: Integration between React Hook Form and Zod