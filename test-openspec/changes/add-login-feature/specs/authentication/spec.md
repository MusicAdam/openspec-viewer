# Authentication Delta

## ADDED Requirements

### Requirement: Social Login
The system SHALL allow users to log in with social accounts.

#### Scenario: Google Login
- **WHEN** a user clicks "Login with Google"
- **THEN** the system redirects to Google OAuth
- **AND** authenticates the user upon successful authorization

#### Scenario: GitHub Login
- **WHEN** a user clicks "Login with GitHub"
- **THEN** the system redirects to GitHub OAuth
- **AND** authenticates the user upon successful authorization
