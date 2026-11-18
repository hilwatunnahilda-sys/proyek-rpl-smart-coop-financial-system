/**
 * Database Connection Status Badge Component
 * Displays live database health & driver information in the UI header
 */

import { db } from '../../infrastructure/database/connection.js';
import { DB_CONNECTION_STATUS } from '../../config/constants.js';

export function renderDbStatusBadge(container) {
  function update() {
    const health = db.getHealthStatus();

    let statusClass = 'badge-success';
    let statusText = `DB Connected (${health.latencyMs}ms)`;
    let iconColor = '#10b981';

    if (health.status === DB_CONNECTION_STATUS.CONNECTING) {
      statusClass = 'badge-warning';
      statusText = 'DB Connecting...';
      iconColor = '#f59e0b';
    } else if (health.status === DB_CONNECTION_STATUS.ERROR || health.status === DB_CONNECTION_STATUS.DISCONNECTED) {
      statusClass = 'badge-danger';
      statusText = 'DB Offline';
      iconColor = '#ef4444';
    }

    container.innerHTML = `
      <div class="db-status-badge ${statusClass}" title="Database: ${health.database} (${health.driver}) | Latency: ${health.latencyMs}ms" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.7rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-surface);">
        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${iconColor}; display: inline-block; animation: pulse 2s infinite;"></span>
        <span>${statusText}</span>
      </div>
    `;

    // Click to test ping
    container.querySelector('.db-status-badge').addEventListener('click', async () => {
      container.querySelector('.db-status-badge span:last-child').textContent = 'Pinging...';
      await db.ping();
    });
  }

  db.onStatusChange(() => update());
  update();
}
