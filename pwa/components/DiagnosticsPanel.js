/**
 * DiagnosticsPanel.js — Interactive hardware self-test trigger and report card.
 */

"use client";

import React from 'react';

export default function DiagnosticsPanel(props) {
  const {
    isRunning = false,
    testResults = props.results || [],
    results = [],
    onRunSelfTest = props.onRunTest,
    onRunTest,
    isDemo = false,
  } = props;

  const items = (testResults && testResults.length > 0) ? testResults : results;
  const handleRun = onRunSelfTest || onRunTest;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all">
      <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🔍</span> System Self-Test
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            12 automated assertions checking hardware wiring and firmware integrity
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ height: '40px', padding: '0 20px', borderRadius: '12px' }}
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Running Self-Test...
            </span>
          ) : (
            '▶️ Run Self-Test'
          )}
        </button>
      </div>

      <div className="p-5 md:p-6">
        {isDemo && (
          <div className="mb-4 p-3 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-lg text-sm border border-sky-100 dark:border-sky-800/50 flex items-start gap-2">
            <span>💡</span>
            <span>Running in Demo Mode will simulate the full self-test suite and generate mock PASS/FAIL outputs.</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex flex-col gap-3">
          {items.map((t, idx) => {
            const isPass = t.status === 'PASS';
            const isFail = t.status === 'FAIL';

            return (
              <div
                key={idx}
                className={`flex flex-col p-4 rounded-xl border transition-colors ${
                  isFail 
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start md:items-center mb-1">
                  <span className="font-semibold text-sm md:text-base text-gray-800 dark:text-gray-200">
                    {t.testName}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ml-3 ${
                    isPass ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                    isFail ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 animate-pulse' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {t.status}
                  </span>
                </div>

                {t.hint && (
                  <div className={`text-sm mt-1.5 ${isFail ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {t.faultType && <strong className="uppercase text-xs tracking-wider opacity-80 mr-1">[{t.faultType}]</strong>}
                    {t.hint}
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && !isRunning && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-4xl text-gray-300 dark:text-gray-600 mb-3">🩺</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                Click "Run Self-Test" to verify electrical connections, NVS memory, and peripheral task health.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}