# Blockchain Transaction Monitoring Service

## Overview

This service monitors and tracks blockchain transactions related to the platform. It provides:

- Transaction status tracking
- Confirmation handling
- Notification integration
- Transaction history
- Error handling and logging

## Architecture

- **Service:** `BlockchainMonitoringService` (NestJS Injectable)
- **Integration:** Used by `BlockchainService` and exposed via `BlockchainController`
- **Monitoring:** Polls or listens for transaction status (extendable for event/webhook support)
- **Notifications:** Integrates with notification system (stubbed, to be implemented)
- **History:** Stores transaction history in-memory (replace with DB for production)

## Usage

- Start monitoring: `POST /blockchain/monitor/:txHash`
- Get status: `GET /blockchain/status/:txHash`
- Get history: `GET /blockchain/history`

## Error Handling

- All methods log errors and important events using NestJS Logger.
- Proper try/catch blocks should be added when integrating with real blockchain/network APIs.

## Testing

- See `src/blockchain/monitoring.service.spec.ts` for comprehensive tests.

## Extending

- Replace in-memory history with persistent storage for production.
- Integrate with a real notification system.
- Implement polling/event-based monitoring for real-time updates.

---

_Last updated: May 31, 2025_
