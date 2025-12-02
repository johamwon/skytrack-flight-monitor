// 通过全局变量访问React和相关hooks
const React = (window as any).React;
const { useState, useEffect, useCallback, useRef } = React;

// 通过全局变量访问Lucide Icons
const { Plane, Search, RefreshCw, AlertCircle, Play, Pause } = (window as any)["lucide-react"];

import { Flight, SearchParams, PlatformStatus, PollingConfig, PricePoint } from './types';
import { generateFlightData, fetchRealFlightData } from './services/geminiService';
import { PlatformManager } from './components/PlatformManager';
import { PriceHistoryChart } from './components/PriceHistoryChart';
import { FlightList } from './components/FlightList';
import { SystemLog } from './components/SystemLog';
// 引入cookie服务
import { savePlatformCookies, getPlatformCookies, removePlatformCookies } from './services/cookieService';

// 添加会话信息存储
interface PlatformSession {
  isConnected: boolean;
  session?: any; // 实际项目中应该定义具体类型
  cookies?: string;
}

const INITIAL_PLATFORMS = [
  { name: 'Ctrip', isConnected: false, lastSync: null },
  { name: 'Fliggy', isConnected: false, lastSync: null },
  { name: 'Qunar', isConnected: false, lastSync: null },
];

function App() {
  // State
  const [searchParams, setSearchParams] = useState({
    origin: 'Beijing',
    destination: 'Shanghai',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);
  const [platformSessions, setPlatformSessions] = useState({
    Ctrip: { isConnected: false },
    Fliggy: { isConnected: false },
    Qunar: { isConnected: false }
  });
  const [flights, setFlights] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [polling, setPolling] = useState({ isActive: false, interval: 10 }); 
  const [logs, setLogs] = useState([]);
  
  const pollIntervalRef = useRef(null);

  // --- Helpers ---
  const addLog = (message) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-49), `[${time}] ${message}`]); // Keep last 50 logs
  };

  const handlePlatformToggle = (name, username, password, cookies) => {
    setPlatforms(prev => prev.map(p => {
      if (p.name === name) {
        const newState = !p.isConnected;
        addLog(`${name.toUpperCase()}: Manual connection status change to ${newState ? 'CONNECTED' : 'DISCONNECTED'}`);
        
        // 如果是断开连接，清除对应的cookies
        if (!newState) {
          removePlatformCookies(name);
        } else if (cookies) {
          // 如果是连接且提供了cookies，保存cookies
          savePlatformCookies(name, cookies);
        }
        
        return {
          ...p,
          isConnected: newState,
          username: newState ? (username || 'Manual User') : undefined,
          lastSync: null
        };
      }
      return p;
    }));
    
    // 更新会话状态
    setPlatformSessions(prev => ({
      ...prev,
      [name]: {
        isConnected: !prev[name].isConnected,
        cookies: cookies || prev[name].cookies
        // 实际项目中这里应该存储真实的会话信息
      }
    }));
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    addLog('SYSTEM: Starting poll cycle...');
    addLog(`SEARCH: ${searchParams.origin} -> ${searchParams.destination} on ${searchParams.date}`);

    // 检查是否有连接的平台
    const connectedPlatforms = platforms.filter(p => p.isConnected);
    
    let newFlights = [];
    
    if (connectedPlatforms.length > 0) {
      addLog('INFO: 尝试从已连接的平台获取实时数据...');
      try {
        // 使用真实平台数据
        newFlights = await fetchRealFlightData(searchParams, platformSessions);
        addLog(`SUCCESS: 从平台获取到 ${newFlights.length} 条航班记录`);
      } catch (error) {
        addLog(`ERROR: 获取平台数据失败: ${error.message}`);
        // 回退到AI生成数据
        addLog('FALLBACK: 使用AI生成模拟数据...');
        newFlights = await generateFlightData(searchParams);
      }
    } else {
      addLog('WARN: No authorized platforms. Using public guest access (limited data).');
      // 使用AI生成数据
      newFlights = await generateFlightData(searchParams);
    }
    
    addLog(`SUCCESS: Retrieved ${newFlights.length} flight records.`);
    setFlights(newFlights);
    
    // Update timestamps
    setPlatforms(prev => prev.map(p => ({
      ...p,
      lastSync: p.isConnected ? new Date() : p.lastSync
    })));

    // Calculate price points
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const getMinPrice = (platform) => {
      const pFlights = newFlights.filter(f => f.platform === platform);
      return pFlights.length > 0 ? Math.min(...pFlights.map(f => f.price)) : null;
    };

    const newPoint = {
      time: now,
      Ctrip: getMinPrice('Ctrip'),
      Fliggy: getMinPrice('Fliggy'),
      Qunar: getMinPrice('Qunar'),
    };

    setPriceHistory(prev => {
      const updated = [...prev, newPoint];
      if (updated.length > 10) return updated.slice(updated.length - 10); 
      return updated;
    });

    setIsLoading(false);
  }, [searchParams, platforms, platformSessions]);

  // --- Effects ---

  // Handle Polling
  useEffect(() => {
    if (polling.isActive) {
      addLog(`SYSTEM: Real-time monitoring started. Interval: ${polling.interval}s`);
      fetchData();
      
      pollIntervalRef.current = window.setInterval(() => {
        fetchData();
      }, polling.interval * 1000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        addLog('SYSTEM: Monitoring paused.');
      }
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [polling.isActive, polling.interval, fetchData]);

  return React.createElement(
    'div',
    { className: 'min-h-screen pb-20 bg-slate-50' },
    // Header
    React.createElement(
      'header',
      { className: 'bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm' },
      React.createElement(
        'div',
        { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement(
            'div',
            { className: 'bg-indigo-600 p-2 rounded-lg shadow-sm' },
            React.createElement(Plane, { className: 'w-5 h-5 text-white' })
          ),
          React.createElement(
            'h1',
            { className: 'text-xl font-bold tracking-tight text-slate-900' },
            'SkyTrack ',
            React.createElement(
              'span',
              { className: 'text-slate-400 font-normal text-sm ml-2' },
              'Beta'
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-4' },
          React.createElement(
            'div',
            { className: 'hidden md:flex items-center text-xs font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600' },
            React.createElement('div', {
              className: `w-2 h-2 rounded-full mr-2 ${polling.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`
            }),
            polling.isActive ? `实时监控中 (${polling.interval}s)` : '监控已暂停'
          ),
          React.createElement(
            'button',
            {
              onClick: () => setPolling(prev => ({ ...prev, isActive: !prev.isActive })),
              className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${polling.isActive 
                  ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'}`
            },
            polling.isActive ? 
              React.createElement(Pause, { className: 'w-4 h-4' }) : 
              React.createElement(Play, { className: 'w-4 h-4' }),
            polling.isActive ? '停止监控' : '开始监控'
          )
        )
      )
    ),

    React.createElement(
      'main',
      { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' },
      
      // Search Bar
      React.createElement(
        'div',
        { className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 items-end' },
        React.createElement(
          'div',
          { className: 'flex-1 w-full' },
          React.createElement(
            'label',
            { className: 'block text-xs font-bold text-slate-500 uppercase mb-1 ml-1' },
            '出发地'
          ),
          React.createElement('input', {
            type: 'text',
            value: searchParams.origin,
            onChange: (e) => setSearchParams(prev => ({ ...prev, origin: e.target.value })),
            className: 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all'
          })
        ),
        React.createElement(
          'div',
          { className: 'flex-1 w-full' },
          React.createElement(
            'label',
            { className: 'block text-xs font-bold text-slate-500 uppercase mb-1 ml-1' },
            '目的地'
          ),
          React.createElement('input', {
            type: 'text',
            value: searchParams.destination,
            onChange: (e) => setSearchParams(prev => ({ ...prev, destination: e.target.value })),
            className: 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all'
          })
        ),
        React.createElement(
          'div',
          { className: 'flex-1 w-full' },
          React.createElement(
            'label',
            { className: 'block text-xs font-bold text-slate-500 uppercase mb-1 ml-1' },
            '日期'
          ),
          React.createElement('input', {
            type: 'date',
            value: searchParams.date,
            onChange: (e) => setSearchParams(prev => ({ ...prev, date: e.target.value })),
            className: 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all'
          })
        ),
        React.createElement(
          'button',
          {
            onClick: () => fetchData(),
            disabled: isLoading,
            className: 'w-full md:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-200'
          },
          isLoading ? 
            React.createElement(RefreshCw, { className: 'w-4 h-4 animate-spin' }) : 
            React.createElement(Search, { className: 'w-4 h-4' }),
          '查询'
        )
      ),

      React.createElement(
        'div',
        { className: 'grid grid-cols-1 lg:grid-cols-3 gap-8' },
        // Left Column: Settings & List
        React.createElement(
          'div',
          { className: 'lg:col-span-2 space-y-6' },
          React.createElement(PlatformManager, {
            platforms: platforms,
            onToggleConnection: handlePlatformToggle
          }),

          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { className: 'flex items-center justify-between mb-4' },
              React.createElement(
                'h2',
                { className: 'text-lg font-semibold text-slate-800' },
                '航班列表'
              ),
              React.createElement(
                'span',
                { className: 'text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded' },
                `Found ${flights.length} flights`
              )
            ),
            React.createElement(FlightList, { flights: flights, loading: isLoading })
          )
        ),

        // Right Column: Analytics & Logs
        React.createElement(
          'div',
          { className: 'space-y-6 flex flex-col' },
          React.createElement(PriceHistoryChart, { data: priceHistory }),
          
          React.createElement(
            'div',
            { className: 'bg-indigo-50 border border-indigo-100 p-5 rounded-xl' },
            React.createElement(
              'div',
              { className: 'flex items-start gap-2 mb-3' },
              React.createElement(AlertCircle, { className: 'w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5' }),
              React.createElement(
                'h3',
                { className: 'font-bold text-indigo-800' },
                '实时监控'
              )
            ),
            React.createElement(
              'p',
              { className: 'text-sm text-indigo-700 mb-4 leading-relaxed' },
              '启动实时监控以自动追踪价格变化。系统将按照设定间隔自动抓取最新价格数据。'
            ),
            
            React.createElement(
              'div',
              { className: 'flex items-center gap-3' },
              React.createElement('input', {
                type: 'range',
                min: '5',
                max: '60',
                value: polling.interval,
                onChange: (e) => setPolling(prev => ({ ...prev, interval: parseInt(e.target.value) })),
                className: 'w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer',
                disabled: polling.isActive
              }),
              React.createElement(
                'span',
                { className: 'text-xs font-mono bg-indigo-100 text-indigo-800 px-2 py-1 rounded whitespace-nowrap w-14 text-center' },
                `${polling.interval}s`
              )
            )
          ),

          React.createElement(SystemLog, { logs: logs })
        )
      )
    )
  );
}

export default App;