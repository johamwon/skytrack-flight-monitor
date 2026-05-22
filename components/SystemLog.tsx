import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface Props {
  logs: string[];
}

export const SystemLog: React.FC<Props> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden flex flex-col h-full min-h-[200px]">
      <div className="bg-slate-950 px-4 py-2 flex items-center gap-2 border-b border-slate-800">
        <Terminal className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-mono text-slate-400">Hotel Collector Logs</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">等待采集任务执行...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="break-all">
              <span className="text-slate-500 mr-2">[{log.split(']')[0].replace('[','')}]</span>
              <span className={
                log.includes('ERROR') ? 'text-red-400' :
                log.includes('SUCCESS') ? 'text-emerald-400' :
                log.includes('WARN') ? 'text-amber-400' :
                'text-slate-300'
              }>
                {log.split(']').slice(1).join(']')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};