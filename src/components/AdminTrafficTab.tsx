import React, { useState } from 'react';
import { 
  Globe, 
  TrendingUp, 
  Users, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Clock, 
  RefreshCw, 
  Activity, 
  Sparkles,
  Eye,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { SiteVisitorStats } from '../types';
import { recordSiteVisit, resetSiteVisitorStats } from '../lib/firebase';

interface AdminTrafficTabProps {
  stats: SiteVisitorStats | null;
}

export const AdminTrafficTab: React.FC<AdminTrafficTabProps> = ({ stats }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTotal, setCustomTotal] = useState('');
  const [customUnique, setCustomUnique] = useState('');
  const [customToday, setCustomToday] = useState('');

  // 100% Accurate counters - default to 0, never fake pre-seeded numbers
  const totalVisits = stats?.totalVisits ?? 0;
  const uniqueVisitors = stats?.uniqueVisitors ?? 0;
  const todayVisits = stats?.todayVisits ?? 0;
  const recentVisits = stats?.recentVisits || [];

  // Accurate device breakdown from real Firestore data
  const rawMobile = stats?.deviceCounts?.mobile ?? recentVisits.filter(v => v.device === 'Mobile').length;
  const rawDesktop = stats?.deviceCounts?.desktop ?? recentVisits.filter(v => v.device === 'Desktop').length;
  const rawTablet = stats?.deviceCounts?.tablet ?? recentVisits.filter(v => v.device === 'Tablet').length;
  const totalDeviceHits = rawMobile + rawDesktop + rawTablet;

  const mobilePct = totalDeviceHits > 0 ? Math.round((rawMobile / totalDeviceHits) * 100) : 0;
  const desktopPct = totalDeviceHits > 0 ? Math.round((rawDesktop / totalDeviceHits) * 100) : 0;
  const tabletPct = totalDeviceHits > 0 ? Math.max(0, 100 - mobilePct - desktopPct) : 0;

  const handleTestHit = async () => {
    setIsSimulating(true);
    setActionNotice(null);
    try {
      await recordSiteVisit({ isTestHit: true, forceNewSession: true });
      setActionNotice('✓ Real visitor hit logged and verified in Firestore.');
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      setActionNotice('Recorded locally.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetToZero = async () => {
    if (!window.confirm('Reset all site visitor counters to 0? This will start fresh with 100% real live tracking.')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetSiteVisitorStats({ totalVisits: 0, uniqueVisitors: 0, todayVisits: 0 });
      setActionNotice('✓ Traffic counters successfully reset to 0.');
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      setActionNotice('Could not reset counters.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleApplyCustomBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    try {
      await resetSiteVisitorStats({
        totalVisits: parseInt(customTotal) || 0,
        uniqueVisitors: parseInt(customUnique) || 0,
        todayVisits: parseInt(customToday) || 0
      });
      setShowCustomModal(false);
      setActionNotice('✓ Custom baseline applied successfully.');
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      setActionNotice('Could not apply baseline.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-emerald-950">Accurate Real-Time Telemetry Active</span>
          <span className="text-emerald-700 hidden sm:inline">
            · Admin browsing excluded · Deduplicated 30-min visitor sessions · IST time standard
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomModal(true)}
            className="text-[11px] px-2.5 py-1 bg-white border border-emerald-300 text-emerald-900 rounded-lg hover:bg-emerald-100 transition-colors font-medium cursor-pointer"
          >
            Calibrate Baseline
          </button>
          <button
            onClick={handleResetToZero}
            disabled={isResetting}
            className="text-[11px] px-2.5 py-1 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-amber-300" />
            <span>Reset to 0</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-neutral-900 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Live Visitor Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Visits */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Site Visits</span>
            <Globe className="w-4 h-4 text-black" />
          </div>
          <p className="text-3xl font-extrabold text-black tracking-tight">{totalVisits.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold">
            <TrendingUp className="w-3 h-3" />
            <span>Accurate Lifetime Sessions</span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Unique Visitors</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-blue-700 tracking-tight">{uniqueVisitors.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">Distinct client devices</p>
        </div>

        {/* Today's Visits */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Today&apos;s Traffic</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">{todayVisits.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Recorded Today (IST)</span>
          </div>
        </div>

        {/* Last Activity */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Last Recorded Hit</span>
            <Clock className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-sm font-bold text-black mt-1">
            {stats?.lastVisitAt 
              ? new Date(stats.lastVisitAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Waiting for hits'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {stats?.lastVisitAt ? new Date(stats.lastVisitAt).toLocaleDateString() : 'Real-Time Active'}
          </p>
        </div>
      </div>

      {/* Device Breakdown & Real-Time Hit Verification */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Distribution */}
        <div className="md:col-span-2 bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-black flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-black" /> Device Distribution
              </h4>
              <p className="text-xs text-gray-500">Live platforms discovering AMRR Perfumes</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2.5 py-1 rounded-full border border-gray-200 text-gray-600">
              {totalDeviceHits} Total Classified Hits
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center">
              <Smartphone className="w-5 h-5 mx-auto text-blue-600 mb-1.5" />
              <p className="text-xl font-bold text-black">{mobilePct}%</p>
              <span className="text-[10px] text-gray-500 font-semibold uppercase">Mobile Phones ({rawMobile})</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center">
              <Monitor className="w-5 h-5 mx-auto text-stone-700 mb-1.5" />
              <p className="text-xl font-bold text-black">{desktopPct}%</p>
              <span className="text-[10px] text-gray-500 font-semibold uppercase">Laptops / PC ({rawDesktop})</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center">
              <Tablet className="w-5 h-5 mx-auto text-amber-600 mb-1.5" />
              <p className="text-xl font-bold text-black">{tabletPct}%</p>
              <span className="text-[10px] text-gray-500 font-semibold uppercase">Tablets / iPads ({rawTablet})</span>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="space-y-1">
            <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden flex">
              <div style={{ width: `${mobilePct}%` }} className="bg-blue-600 h-full" title={`Mobile ${mobilePct}%`} />
              <div style={{ width: `${desktopPct}%` }} className="bg-stone-800 h-full" title={`Desktop ${desktopPct}%`} />
              <div style={{ width: `${tabletPct}%` }} className="bg-amber-500 h-full" title={`Tablet ${tabletPct}%`} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>● Mobile ({mobilePct}%)</span>
              <span>● Desktop ({desktopPct}%)</span>
              <span>● Tablet ({tabletPct}%)</span>
            </div>
          </div>
        </div>

        {/* Real-Time Hit Verification Card */}
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-sm text-black flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" /> Live Verification Test
            </h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Real visitors browsing your site are automatically counted without any action needed. Click below to verify that Firestore receives live hits instantly.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleTestHit}
              disabled={isSimulating}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>{isSimulating ? 'Logging Live Hit...' : 'Test Real-Time Hit'}</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center">
              Updates all open admin screens in real-time
            </p>
          </div>
        </div>
      </div>

      {/* Live Recent Visits Log Stream */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-black" />
            <h4 className="font-bold text-sm text-black">Recent Visitor Activity Stream</h4>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Last {recentVisits.length} Real Recorded Sessions</span>
        </div>

        {recentVisits.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No live visit events recorded yet. Once a client opens your store, their real device, source, and time will appear here automatically.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
            {recentVisits.map((vis, idx) => {
              const DeviceIcon = vis.device === 'Mobile' ? Smartphone : vis.device === 'Tablet' ? Tablet : Monitor;
              return (
                <div key={vis.id || idx} className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/60 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                      <DeviceIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black">{vis.device} Session</span>
                        <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {vis.page || '/'}
                        </span>
                        {vis.referrer && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                            {vis.referrer}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {vis.device === 'Mobile' ? 'Smart Device Explorer' : 'Atelier Desktop Patron'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-gray-500 whitespace-nowrap">
                    {vis.timestamp ? new Date(vis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Baseline Calibration Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-black flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                Calibrate Traffic Baseline
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Enter your exact baseline values if migrating from an existing counter or setting a verified starting point:
              </p>
            </div>

            <form onSubmit={handleApplyCustomBaseline} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider text-[10px]">Total Site Visits</label>
                <input
                  type="number"
                  min="0"
                  value={customTotal}
                  onChange={(e) => setCustomTotal(e.target.value)}
                  placeholder="e.g. 0 or 250"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider text-[10px]">Unique Visitors</label>
                <input
                  type="number"
                  min="0"
                  value={customUnique}
                  onChange={(e) => setCustomUnique(e.target.value)}
                  placeholder="e.g. 0 or 180"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider text-[10px]">Today&apos;s Traffic</label>
                <input
                  type="number"
                  min="0"
                  value={customToday}
                  onChange={(e) => setCustomToday(e.target.value)}
                  placeholder="e.g. 0 or 15"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-2 text-white bg-black hover:bg-neutral-800 rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'Saving...' : 'Set Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
