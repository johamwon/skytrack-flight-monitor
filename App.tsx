import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  Gauge,
  Hotel,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck
} from 'lucide-react';

import {
  AlertEvent,
  CollectorReport,
  Hotel as HotelOffer,
  MonitoringSettings,
  PlatformStatus,
  PollingConfig,
  PricePoint,
  SearchParams
} from './types';
import { buildAiFallbackResult, fetchRealHotelData } from './services/geminiService';
import { PlatformManager } from './components/PlatformManager';
import { PriceHistoryChart } from './components/PriceHistoryChart';
import { HotelList } from './components/HotelList';
import { SystemLog } from './components/SystemLog';
import { savePlatformCookies, removePlatformCookies } from './services/cookieService';

interface PlatformSession {
  isConnected: boolean;
  session?: any;
  cookies?: string;
}

const INITIAL_PLATFORMS: PlatformStatus[] = [
  { name: 'Ctrip', isConnected: false, lastSync: null },
  { name: 'Fliggy', isConnected: false, lastSync: null },
  { name: 'Qunar', isConnected: false, lastSync: null }
];

const INITIAL_REPORT: CollectorReport = {
  tasks: [],
  metrics: {
    successRate: 1,
    retryCount: 0,
    failureCount: 0,
    lastRun: undefined,
    sampleReplayQueue: 0
  },
  sessionPool: {
    total: 6,
    active: 0,
    idle: 6
  },
  compliance: [],
  notes: ['等待首次采集']
};

const MONITORING_DEFAULTS = {
  alertLimit: 12,
  pollingInterval: 12,
  settings: {
    priceThreshold: 900,
    dropPercentage: 12,
    notifyOnAvailability: true,
    anomalySensitivity: 'medium' as MonitoringSettings['anomalySensitivity']
  }
};

const FEATURE_HIGHLIGHTS = [
  { name: '多平台比价', status: '已启用' },
  { name: '价格日历 & 历史最低价', status: '已启用' },
  { name: '价格预测趋势', status: '已启用' },
  { name: '可订性追踪与提醒', status: '已启用' },
  { name: '收藏与分组', status: '已启用' },
  { name: '相似酒店替代推荐', status: '规划中' }
];

const formatTime = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const buildSearchDefaults = (): SearchParams => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return {
    destination: 'Shanghai',
    checkIn: today.toISOString().split('T')[0],
    checkOut: tomorrow.toISOString().split('T')[0],
    guests: 2,
    rooms: 1,
    starRating: 'Any',
    brand: ''
  };
};

const buildHotelKey = (hotel: HotelOffer) => `${hotel.platform}-${hotel.name}-${hotel.roomType}`;

// Thresholds represent price differences in CNY that trigger anomaly alerts.
const getAnomalyThreshold = (sensitivity: MonitoringSettings['anomalySensitivity']) => {
  if (sensitivity === 'high') return 120;
  if (sensitivity === 'medium') return 200;
  return 320;
};

function App() {
  const [searchParams, setSearchParams] = useState<SearchParams>(buildSearchDefaults);
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);
  const [platformSessions, setPlatformSessions] = useState<Record<'Ctrip' | 'Fliggy' | 'Qunar', PlatformSession>>({
    Ctrip: { isConnected: false },
    Fliggy: { isConnected: false },
    Qunar: { isConnected: false }
  });
  const [hotels, setHotels] = useState<HotelOffer[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [collectorReport, setCollectorReport] = useState<CollectorReport>(INITIAL_REPORT);
  const [isLoading, setIsLoading] = useState(false);
  const [polling, setPolling] = useState<PollingConfig>({
    isActive: false,
    interval: MONITORING_DEFAULTS.pollingInterval
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [alertSettings, setAlertSettings] = useState<MonitoringSettings>(MONITORING_DEFAULTS.settings);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [savedGroups, setSavedGroups] = useState<Record<string, string>>({});

  const pollIntervalRef = useRef<number | null>(null);
  const lastSnapshotRef = useRef<HotelOffer[]>([]);

  const addLog = (message: string) => {
    const time = formatTime();
    setLogs((prev) => [...prev.slice(-49), `[${time}] ${message}`]);
  };

  const pushAlerts = (newAlerts: AlertEvent[]) => {
    if (newAlerts.length === 0) return;
    setAlerts((prev) => [...newAlerts, ...prev].slice(0, MONITORING_DEFAULTS.alertLimit));
    newAlerts.forEach((alert) => {
      addLog(`ALERT: ${alert.message}`);
    });
  };

  const handlePlatformToggle = (name: 'Ctrip' | 'Fliggy' | 'Qunar', username?: string, password?: string, cookies?: string) => {
    setPlatforms((prev) =>
      prev.map((platform) => {
        if (platform.name === name) {
          const newState = !platform.isConnected;
          addLog(`${name.toUpperCase()}: 手动切换为 ${newState ? '已连接' : '已断开'}`);

          if (!newState) {
            removePlatformCookies(name);
          } else if (cookies) {
            savePlatformCookies(name, cookies);
          }

          return {
            ...platform,
            isConnected: newState,
            username: newState ? username || 'Manual User' : undefined,
            lastSync: null
          };
        }
        return platform;
      })
    );

    setPlatformSessions((prev) => ({
      ...prev,
      [name]: {
        isConnected: !prev[name].isConnected,
        cookies: cookies || prev[name].cookies
      }
    }));
  };

  const evaluateAlerts = (nextHotels: HotelOffer[]) => {
    const previousMap = new Map(lastSnapshotRef.current.map((hotel) => [buildHotelKey(hotel), hotel]));
    const newAlerts: AlertEvent[] = [];
    const anomalyThreshold = getAnomalyThreshold(alertSettings.anomalySensitivity);

    nextHotels.forEach((hotel) => {
      const previous = previousMap.get(buildHotelKey(hotel));
      const timestamp = formatTime();

      if (hotel.price <= alertSettings.priceThreshold) {
        newAlerts.push({
          id: `${hotel.id}-threshold`,
          time: timestamp,
          type: 'Threshold',
          message: `${hotel.name} 价格低于阈值 ¥${alertSettings.priceThreshold}`,
          platform: hotel.platform,
          hotelName: hotel.name,
          price: hotel.price
        });
      }

      if (previous) {
        const priceDrop = previous.price - hotel.price;
        const dropPercentage = previous.price ? (priceDrop / previous.price) * 100 : 0;

        if (priceDrop > 0 && dropPercentage >= alertSettings.dropPercentage) {
          newAlerts.push({
            id: `${hotel.id}-drop`,
            time: timestamp,
            type: 'PriceDrop',
            message: `${hotel.name} 降价 ${dropPercentage.toFixed(1)}% 至 ¥${hotel.price}`,
            platform: hotel.platform,
            hotelName: hotel.name,
            price: hotel.price
          });
        }

        if (
          alertSettings.notifyOnAvailability &&
          previous.availability === 'SoldOut' &&
          hotel.availability !== 'SoldOut'
        ) {
          newAlerts.push({
            id: `${hotel.id}-availability`,
            time: timestamp,
            type: 'Availability',
            message: `${hotel.name} 由满房恢复可订`,
            platform: hotel.platform,
            hotelName: hotel.name,
            price: hotel.price
          });
        }

        if (Math.abs(previous.price - hotel.price) >= anomalyThreshold) {
          newAlerts.push({
            id: `${hotel.id}-anomaly`,
            time: timestamp,
            type: 'Anomaly',
            message: `${hotel.name} 出现异常波动，当前 ¥${hotel.price}`,
            platform: hotel.platform,
            hotelName: hotel.name,
            price: hotel.price
          });
        }
      }
    });

    pushAlerts(newAlerts);
    lastSnapshotRef.current = nextHotels;
  };

  const updatePriceHistory = (offers: HotelOffer[]) => {
    const now = formatTime();
    const getMinPrice = (platform: HotelOffer['platform']) => {
      const filtered = offers.filter(
        (hotel) => hotel.platform === platform && hotel.availability !== 'SoldOut'
      );
      return filtered.length > 0 ? Math.min(...filtered.map((hotel) => hotel.price)) : null;
    };

    const newPoint: PricePoint = {
      time: now,
      Ctrip: getMinPrice('Ctrip'),
      Fliggy: getMinPrice('Fliggy'),
      Qunar: getMinPrice('Qunar')
    };

    setPriceHistory((prev) => {
      const updated = [...prev, newPoint];
      if (updated.length > 10) return updated.slice(updated.length - 10);
      return updated;
    });
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    addLog('SYSTEM: 开始酒店采集轮询...');
    addLog(`SEARCH: ${searchParams.destination} ${searchParams.checkIn}~${searchParams.checkOut}`);

    const connectedPlatforms = platforms.filter((platform) => platform.isConnected);
    let nextHotels: HotelOffer[] = [];
    let report = collectorReport;

    if (connectedPlatforms.length > 0) {
      addLog('INFO: 通过 CDP 采集层获取 OTA 数据...');
      try {
        const result = await fetchRealHotelData(searchParams, platformSessions);
        nextHotels = result.hotels;
        report = result.report;
        addLog(`SUCCESS: 采集到 ${nextHotels.length} 条酒店报价`);
      } catch (error: any) {
        addLog(`ERROR: OTA 采集失败: ${error.message}`);
        addLog('FALLBACK: 使用 AI 模拟数据');
        const result = await buildAiFallbackResult(searchParams, 'OTA 采集失败，回退至 AI');
        nextHotels = result.hotels;
        report = result.report;
      }
    } else {
      addLog('WARN: 未授权平台，使用公开模式');
      const result = await buildAiFallbackResult(searchParams, '无授权平台');
      nextHotels = result.hotels;
      report = result.report;
    }

    setCollectorReport(report);
    setHotels(nextHotels);
    updatePriceHistory(nextHotels);
    evaluateAlerts(nextHotels);

    setPlatforms((prev) =>
      prev.map((platform) => ({
        ...platform,
        lastSync: platform.isConnected ? new Date() : platform.lastSync
      }))
    );

    setIsLoading(false);
  }, [alertSettings, platforms, platformSessions, searchParams]);

  useEffect(() => {
    if (polling.isActive) {
      addLog(`SYSTEM: 实时监控启动，间隔 ${polling.interval}s`);
      fetchData();

      pollIntervalRef.current = window.setInterval(() => {
        fetchData();
      }, polling.interval * 1000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      addLog('SYSTEM: 实时监控已暂停');
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [polling.isActive, polling.interval, fetchData]);

  const handleToggleSave = (hotelId: string) => {
    setSavedGroups((prev) => {
      if (prev[hotelId]) {
        const updated = { ...prev };
        delete updated[hotelId];
        return updated;
      }
      return { ...prev, [hotelId]: '商务差旅' };
    });
  };

  const handleUpdateGroup = (hotelId: string, group: string) => {
    setSavedGroups((prev) => ({ ...prev, [hotelId]: group }));
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
              <Hotel className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              SkyTrack Hotels
              <span className="text-slate-400 font-normal text-sm ml-2">Beta</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-xs font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
              <div
                className={`w-2 h-2 rounded-full mr-2 ${polling.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
              />
              {polling.isActive ? `实时监控中 (${polling.interval}s)` : '监控已暂停'}
            </div>
            <button
              onClick={() => setPolling((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${polling.isActive
                ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'}`}
            >
              {polling.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {polling.isActive ? '停止监控' : '开始监控'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">目的地</label>
              <input
                type="text"
                value={searchParams.destination}
                onChange={(event) => setSearchParams((prev) => ({ ...prev, destination: event.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">入住</label>
              <input
                type="date"
                value={searchParams.checkIn}
                onChange={(event) => setSearchParams((prev) => ({ ...prev, checkIn: event.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">离店</label>
              <input
                type="date"
                value={searchParams.checkOut}
                onChange={(event) => setSearchParams((prev) => ({ ...prev, checkOut: event.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">入住人数</label>
              <input
                type="number"
                min={1}
                value={searchParams.guests}
                onChange={(event) =>
                  setSearchParams((prev) => ({ ...prev, guests: Math.max(1, Number(event.target.value)) }))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">房间数</label>
              <input
                type="number"
                min={1}
                value={searchParams.rooms}
                onChange={(event) =>
                  setSearchParams((prev) => ({ ...prev, rooms: Math.max(1, Number(event.target.value)) }))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">星级</label>
              <select
                value={searchParams.starRating}
                onChange={(event) =>
                  setSearchParams((prev) => ({ ...prev, starRating: event.target.value as SearchParams['starRating'] }))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="Any">不限</option>
                <option value="3+">三星及以上</option>
                <option value="4+">四星及以上</option>
                <option value="5">五星</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">品牌</label>
              <input
                type="text"
                value={searchParams.brand}
                onChange={(event) => setSearchParams((prev) => ({ ...prev, brand: event.target.value }))}
                placeholder="如：Marriott"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="w-full px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              查询酒店
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PlatformManager platforms={platforms} onToggleConnection={handlePlatformToggle} />

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-700">热门项目灵感</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {FEATURE_HIGHLIGHTS.map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                    <span className="text-slate-700">{feature.name}</span>
                    <span className={`text-xs font-medium ${feature.status === '已启用' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {feature.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">酒店报价列表</h2>
                <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                  Found {hotels.length} offers
                </span>
              </div>
              <HotelList
                hotels={hotels}
                loading={isLoading}
                savedGroups={savedGroups}
                onToggleSave={handleToggleSave}
                onUpdateGroup={handleUpdateGroup}
              />
            </div>
          </div>

          <div className="space-y-6 flex flex-col">
            <PriceHistoryChart data={priceHistory} />

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <h3 className="font-bold text-indigo-800">监控与提醒</h3>
              </div>
              <p className="text-sm text-indigo-700 mb-4 leading-relaxed">
                启动实时监控以自动追踪酒店价格变化、可订性变化与异常波动。
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-indigo-700 mb-2">
                    <span>采集间隔</span>
                    <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-1 rounded">{polling.interval}s</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={polling.interval}
                    onChange={(event) => setPolling((prev) => ({ ...prev, interval: parseInt(event.target.value) }))}
                    className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                    disabled={polling.isActive}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex flex-col gap-1 text-indigo-700">
                    价格阈值
                    <input
                      type="number"
                      value={alertSettings.priceThreshold}
                      onChange={(event) =>
                        setAlertSettings((prev) => ({ ...prev, priceThreshold: Number(event.target.value) }))
                      }
                      className="bg-white border border-indigo-200 rounded-md px-2 py-1 text-indigo-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-indigo-700">
                    降价幅度 %
                    <input
                      type="number"
                      value={alertSettings.dropPercentage}
                      onChange={(event) =>
                        setAlertSettings((prev) => ({ ...prev, dropPercentage: Number(event.target.value) }))
                      }
                      className="bg-white border border-indigo-200 rounded-md px-2 py-1 text-indigo-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-indigo-700">
                    异常敏感度
                    <select
                      value={alertSettings.anomalySensitivity}
                      onChange={(event) =>
                        setAlertSettings((prev) => ({ ...prev, anomalySensitivity: event.target.value as MonitoringSettings['anomalySensitivity'] }))
                      }
                      className="bg-white border border-indigo-200 rounded-md px-2 py-1 text-indigo-900"
                    >
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-indigo-700 mt-5">
                    <input
                      type="checkbox"
                      checked={alertSettings.notifyOnAvailability}
                      onChange={(event) =>
                        setAlertSettings((prev) => ({ ...prev, notifyOnAvailability: event.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    可订恢复提醒
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <BellRing className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-semibold text-slate-700">最近提醒</h3>
              </div>
              {alerts.length === 0 ? (
                <div className="text-xs text-slate-400">暂无提醒，开始监控以捕捉降价与可订变化。</div>
              ) : (
                <div className="space-y-2 text-xs">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-400">{alert.time}</span>
                      <span className="text-slate-700">{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">数据合规与风险控制</h3>
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                {(collectorReport.compliance.length > 0 ? collectorReport.compliance : []).map((policy) => (
                  <div key={policy.platform} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="font-semibold text-slate-700">{policy.platform}</div>
                    <div className="mt-1">登录要求: {policy.loginRequired ? '需要登录' : '可匿名'}</div>
                    <div>Cookie: {policy.cookieScope}</div>
                    <div>频控: {policy.rateLimitPerMinute}/min</div>
                    <div>反爬: {policy.antiBotMitigation.join(' / ')}</div>
                    <div>降级: {policy.fallback}</div>
                  </div>
                ))}
                {collectorReport.compliance.length === 0 && (
                  <div className="text-slate-400">等待采集任务返回平台合规信息。</div>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-700">采集质量与稳定性</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  成功率
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {(collectorReport.metrics.successRate * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  重试次数
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {collectorReport.metrics.retryCount}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  失败任务
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {collectorReport.metrics.failureCount}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  回放队列
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {collectorReport.metrics.sampleReplayQueue}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                会话池: {collectorReport.sessionPool.active}/{collectorReport.sessionPool.total} 活跃
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-500">
                {collectorReport.tasks.length === 0 ? (
                  <div>等待采集任务启动。</div>
                ) : (
                  collectorReport.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <span>{task.platform} · {task.steps[0]}</span>
                      <span className={task.status === 'success' ? 'text-emerald-600' : task.status === 'failed' ? 'text-rose-600' : 'text-slate-400'}>
                        {task.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <SystemLog logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
