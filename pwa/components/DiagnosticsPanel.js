/**
 * DiagnosticsPanel.js — Interactive hardware self-test trigger and report card.
 *
 * Purpose : Executes self-test suite and renders structured PASS/FAIL assertions
 *           with root-cause hardware vs code attribution and advice.
 * Depends : React only.
 * Used by : SystemScreen.js, dev-preview.
 */

"use client";

import React from 'react';

export default function DiagnosticsPanel({
  isRunning = false,
  testResults = [],
  onRunSelfTest,
  isDemo = false,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">🔍 System Self-Test</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            12 automated assertions checking hardware wiring and firmware integrity
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={onRunSelfTest}
          disabled={isRunning}
          style={{ height: '40px', minHeight: '40px' }}
        >
          {isRunning ? '⏳ Running...' : '▶️ Run Self-Test'}
        </button>
      </div>

      {isDemo && (
        <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '4px' }}>
          💡 Running in Demo Mode will simulate the full self-test suite.
        </div>
      )}

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        {testResults.map((t, idx) => {
          const isPass = t.status === 'PASS';
          const isFail = t.status === 'FAIL';
          const badgeClass = isPass ? 'badge-success' : isFail ? 'badge-danger' : 'badge-info';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: isFail ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: isFail ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.testName}</span>
                <span className={`badge ${badgeClass}`}>{t.status}</span>
              </div>

              {t.hint && (
                <div style={{ fontSize: '0.8rem', color: isFail ? '#f87171' : 'var(--text-secondary)', marginTop: '4px' }}>
                  {t.faultType && <strong>[{t.faultType}] </strong>}
                  {t.hint}
                </div>
              )}
            </div>
          );
        })}

        {testResults.length === 0 && !isRunning && (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Click &quot;Run Self-Test&quot; to verify electrical connections, NVS, and peripheral tasks.
          </div>
        )}
      </div>
    </div>
  );
}
