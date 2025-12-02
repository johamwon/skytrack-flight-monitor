import React from 'react';
import { Flight } from '../types';
import { ArrowRight, ExternalLink } from 'lucide-react';

interface Props {
  flights: Flight[];
  loading: boolean;
}

export const FlightList: React.FC<Props> = ({ flights, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-white p-6 rounded-xl border border-gray-100 h-24"></div>
        ))}
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        暂无航班信息，请开始搜索或等待同步。
      </div>
    );
  }

  // Group by flight number for cleaner comparison if needed, 
  // but for simplicity we list all to show platform differences.
  const sortedFlights = [...flights].sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-4">
      {sortedFlights.map((flight) => (
        <div 
          key={flight.id} 
          className="group bg-white p-5 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row items-center justify-between"
        >
          <div className="flex-1 w-full md:w-auto mb-4 md:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wide
                ${flight.platform === 'Ctrip' ? 'bg-blue-100 text-blue-700' : 
                  flight.platform === 'Fliggy' ? 'bg-amber-100 text-amber-700' : 
                  'bg-red-100 text-red-700'}`}>
                {flight.platform === 'Ctrip' ? '携程' : flight.platform === 'Fliggy' ? '飞猪' : '去哪儿'}
              </span>
              <span className="text-slate-900 font-semibold">{flight.airline}</span>
              <span className="text-slate-400 text-sm">{flight.flightNumber}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <div className="text-center">
                <div className="text-xl font-bold text-slate-800">{flight.departureTime}</div>
                <div className="text-xs text-slate-400">{flight.origin}</div>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className="h-[1px] w-12 bg-slate-200 my-1"></div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-slate-800">{flight.arrivalTime}</div>
                <div className="text-xs text-slate-400">{flight.destination}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">¥{flight.price}</div>
              <div className="text-xs text-slate-400">实时报价</div>
            </div>
            <button className="bg-slate-900 hover:bg-indigo-600 text-white p-3 rounded-lg transition-colors">
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};