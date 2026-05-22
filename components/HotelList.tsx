import React from 'react';
import { Hotel } from '../types';
import { ArrowDownRight, ArrowUpRight, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';

interface Props {
  hotels: Hotel[];
  loading: boolean;
  savedGroups: Record<string, string>;
  onToggleSave: (hotelId: string) => void;
  onUpdateGroup: (hotelId: string, group: string) => void;
}

const GROUP_OPTIONS = ['商务差旅', '家庭出游', '周末度假', '长住观察'];

export const HotelList: React.FC<Props> = ({ hotels, loading, savedGroups, onToggleSave, onUpdateGroup }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-white p-6 rounded-xl border border-gray-100 h-28"></div>
        ))}
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        暂无酒店报价，请开始搜索或等待同步。
      </div>
    );
  }

  const sortedHotels = [...hotels].sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-4">
      {sortedHotels.map((hotel) => {
        const savedGroup = savedGroups[hotel.id];
        return (
          <div
            key={hotel.id}
            className="group bg-white p-5 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col gap-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wide
                    ${hotel.platform === 'Ctrip' ? 'bg-blue-100 text-blue-700' :
                      hotel.platform === 'Fliggy' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'}`}>
                    {hotel.platform === 'Ctrip' ? '携程' : hotel.platform === 'Fliggy' ? '飞猪' : '去哪儿'}
                  </span>
                  <span className="text-slate-900 font-semibold">{hotel.name}</span>
                  <span className="text-xs text-slate-400">{hotel.brand}</span>
                  <span className="text-xs text-slate-500">{'★'.repeat(hotel.rating)}</span>
                </div>
                <div className="text-sm text-slate-600 flex flex-wrap gap-3">
                  <span>{hotel.roomType}</span>
                  <span className="text-slate-400">·</span>
                  <span>{hotel.policy}</span>
                  <span className="text-slate-400">·</span>
                  <span>{hotel.checkIn} 入住</span>
                  <span className="text-slate-400">·</span>
                  <span>{hotel.checkOut} 离店</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  价格日历最低 ¥{hotel.historicLow ?? hotel.price} · 预测趋势{' '}
                  {hotel.predictedTrend === 'down' ? '降价' : hotel.predictedTrend === 'up' ? '上涨' : '稳定'}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">¥{hotel.price}</div>
                  <div className={`text-xs font-medium ${
                    hotel.availability === 'Available'
                      ? 'text-emerald-600'
                      : hotel.availability === 'Limited'
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }`}>
                    {hotel.availability === 'Available'
                      ? '可订'
                      : hotel.availability === 'Limited'
                        ? '紧张'
                        : '满房'}
                  </div>
                </div>

                <button
                  onClick={() => onToggleSave(hotel.id)}
                  className="p-2 rounded-lg border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  {savedGroup ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </button>
                <button className="bg-slate-900 hover:bg-indigo-600 text-white p-3 rounded-lg transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-slate-100">{hotel.location}</span>
                {hotel.predictedTrend === 'down' ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <ArrowDownRight className="w-3 h-3" /> 预计降价
                  </span>
                ) : hotel.predictedTrend === 'up' ? (
                  <span className="flex items-center gap-1 text-rose-600">
                    <ArrowUpRight className="w-3 h-3" /> 预计上涨
                  </span>
                ) : (
                  <span className="text-slate-500">价格稳定</span>
                )}
              </div>

              {savedGroup ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">分组</span>
                  <select
                    value={savedGroup}
                    onChange={(event) => onUpdateGroup(hotel.id, event.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                  >
                    {GROUP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-slate-400">未收藏</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
