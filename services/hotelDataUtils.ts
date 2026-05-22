export const HOTEL_NAMES = ['万豪国际酒店', '洲际假日酒店', '君悦酒店', '雅高索菲特', '希尔顿逸林', '香格里拉'];
export const ROOM_TYPES = ['豪华大床房', '行政双床房', '高级景观房', '商务套房'];
export const POLICIES = ['含早/可取消', '无早/不可取消', '双早/可取消', '含早/限时取消'];
export const BRANDS = ['Marriott', 'IHG', 'Hyatt', 'Accor', 'Hilton', 'Shangri-La'];

/**
 * Build a 7-day price calendar from an ISO date string (YYYY-MM-DD).
 */
export const buildPriceCalendar = (basePrice: number, checkIn: string): { date: string; price: number }[] => {
  const start = new Date(checkIn);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString().split('T')[0],
      price: Math.max(420, Math.round(basePrice + (Math.random() * 120 - 60)))
    };
  });
};
