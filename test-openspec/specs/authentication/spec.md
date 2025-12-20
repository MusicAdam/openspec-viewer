# Authentication

## Requirements

### Requirement: User Login
The system SHALL allow users to log in with email and password.

#### Scenario: Successful Login
- **WHEN** a user enters valid credentials
- **THEN** the system authenticates the user
- **AND** redirects to the dashboard

#### Scenario: Failed Login
- **WHEN** a user enters invalid credentials
- **THEN** the system displays an error message
- **AND** allows the user to retry
