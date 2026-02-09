# Product Overview

nocodb-cli is a Node.js TypeScript SDK and command-line interface for NocoDB v2 APIs. It provides programmatic and terminal-based access to NocoDB instances for managing bases, tables, views, rows, and metadata.

## Core Capabilities

- **SDK**: Fully typed TypeScript client for NocoDB v2 REST APIs with generic types for all metadata operations
- **CLI**: Comprehensive command-line tool for all NocoDB operations without writing code
- **Multi-workspace**: Manage multiple NocoDB instances or bases with distinct URLs, tokens, and configurations
- **Data I/O**: Import/export data in JSON and CSV formats with schema validation and bulk operations
- **Metadata Management**: Full CRUD operations on bases, tables, views, columns, filters, sorts, and more
- **Cloud Integration**: Specialized commands for NocoDB Cloud workspace management

## Target Users

Developers, DevOps engineers, and data administrators who need to:
- Automate NocoDB operations in CI/CD pipelines
- Perform bulk data operations
- Manage multiple NocoDB environments
- Script database schema changes
- Integrate NocoDB with other tools

## Key Features

- Workspace-based configuration with alias support for friendly names
- Environment variable support for ephemeral/CI environments
- Configurable timeout and retry behavior with exponential backoff
- Multiple output formats (JSON, CSV, table) with field selection
- Swagger-based dynamic API command generation
- Comprehensive error handling with typed exceptions
