# Frontend Test Plan

## Overview
This test plan covers the frontend application for LifeVault, focusing on user interface components, wallet interaction flows, and dashboard functionality.

## Test Scope
- **Component Tests**: Individual UI components (Button, Modal, Card).
- **Integration Tests**: Page flows (Dashboard rendering, Form submission).
- **E2E Tests**: Critical user journeys (Login -> Connect Wallet -> Upload Memory).

## Features to Test

### 1. Core UI Components
**Components**: `Button`, `Card`, `Modal`, `Input`

**Test Cases**:
- Render correctly with props.
- Handle click events.
- Display correct styles based on variants (e.g., destructive, outline).
- Accessibility checks (all interactive elements have proper labels).

### 2. Wallet Connection
**Components**: `ConnectWalletButton`, `WalletAuthModal`
**Context**: `WalletContext`

**Test Cases**:
- Open modal on button click.
- Select wallet provider (e.g., Petra).
- Handle connection success (update state, show balance).
- Handle connection failure (show error toast).
- Sign message for authentication.

### 3. Dashboard
**Page**: `Dashboard`
**Components**: `StatsCards`, `Timeline`

**Test Cases**:
- Render user statistics correctly.
- Display empty state if no memories.
- Render list of memories in chronological order.
- Navigate to memory detail page on click.

### 4. Memory Creation
**Component**: `MemoryUploadModal`

**Test Cases**:
- Open modal on "Add Memory" click.
- Validate form inputs (title, date, file required).
- Handle file selection (image/video).
- Submit form specific data (API call mock).
- Show success message and close modal.

## Test Environment
- **Framework**: Vitest + React Testing Library
- **Browser**: JSDOM (Unit/Integration)
- **External Dependencies**: Mocked Aptos Wallet Adapter, Mocked API calls.
