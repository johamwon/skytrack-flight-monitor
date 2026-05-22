import { CollectorResult, Hotel, SearchParams } from '../types';
import { collectHotelData, buildFallbackReport } from './collectorService';

// In a real scenario, the API key should be securely managed.
// For this demo, we assume it's available in process.env
declare var process: {
  env: {
    API_KEY?: string;
  };
};

const apiKey = process.env.API_KEY || '';

const HOTEL_NAMES = ['万豪国际酒店', '洲际假日酒店', '君悦酒店', '雅高索菲特', '希尔顿逸林', '香格里拉'];
const ROOM_TYPES = ['豪华大床房', '行政双床房', '高级景观房', '商务套房'];
const POLICIES = ['含早/可取消', '无早/不可取消', '双早/可取消', '含早/限时取消'];
const BRANDS = ['Marriott', 'IHG', 'Hyatt', 'Accor', 'Hilton', 'Shangri-La'];

const buildPriceCalendar = (basePrice: number, checkIn: string): { date: string; price: number }[] => {
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

const generateStaticMock = (params: SearchParams): Hotel[] => {
  const platforms: ('Ctrip' | 'Fliggy' | 'Qunar')[] = ['Ctrip', 'Fliggy', 'Qunar'];
  return Array.from({ length: 8 }).map((_, i) => {
    const basePrice = 520 + Math.round(Math.random() * 900);
    const availabilityRoll = Math.random();
    const availability = availabilityRoll > 0.2 ? (availabilityRoll > 0.8 ? 'Limited' : 'Available') : 'SoldOut';
    const rating = [3, 4, 5][Math.floor(Math.random() * 3)];
    const priceCalendar = buildPriceCalendar(basePrice, params.checkIn);
    const historicLow = Math.min(...priceCalendar.map(item => item.price));
    const averagePrice = priceCalendar.reduce((sum, item) => sum + item.price, 0) / priceCalendar.length;
    const trend = basePrice > averagePrice + 80 ? 'up' : basePrice < averagePrice - 80 ? 'down' : 'stable';

    return {
      id: `MOCK-${i}-${Date.now()}`,
      name: HOTEL_NAMES[i % HOTEL_NAMES.length],
      brand: BRANDS[i % BRANDS.length],
      location: params.destination,
      rating,
      platform: platforms[i % platforms.length],
      roomType: ROOM_TYPES[i % ROOM_TYPES.length],
      policy: POLICIES[i % POLICIES.length],
      price: basePrice,
      currency: 'CNY',
      availability,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      guests: params.guests,
      rooms: params.rooms,
      url: '#',
      lastUpdated: new Date().toISOString(),
      tags: ['价格预测', '可订性追踪'],
      priceCalendar,
      predictedTrend: trend,
      historicLow
    };
  });
};

export const generateHotelData = async (params: SearchParams): Promise<Hotel[]> => {
  if (!apiKey) {
    console.warn('No API Key provided, returning static mock data.');
    return generateStaticMock(params);
  }

  try {
    const GoogleGenerativeAI = (window as any).google?.generativeAI?.GoogleGenerativeAI;
    if (!GoogleGenerativeAI) {
      throw new Error('Google Generative AI library not available');
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Generate 6 realistic hotel room offers in ${params.destination} for ${params.checkIn} to ${params.checkOut}.
      Include OTA platforms Ctrip, Fliggy, Qunar. Provide hotel name, brand, star rating, room type, cancellation policy, availability, and price in CNY (400-2000).
      Return JSON array only.
    `;

    const config = {
      responseMimeType: 'application/json'
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: config
    });

    const rawData = JSON.parse(result.response.text() || '[]');

    return rawData.map((item: any, index: number) => {
      const basePrice = Number(item.price) || 880;
      const priceCalendar = buildPriceCalendar(basePrice, params.checkIn);
      const historicLow = Math.min(...priceCalendar.map((entry) => entry.price));
      const averagePrice = priceCalendar.reduce((sum, entry) => sum + entry.price, 0) / priceCalendar.length;
      const trend = basePrice > averagePrice + 80 ? 'up' : basePrice < averagePrice - 80 ? 'down' : 'stable';

      return {
        id: `${item.name}-${index}-${Date.now()}`,
        name: item.name,
        brand: item.brand || BRANDS[index % BRANDS.length],
        location: params.destination,
        rating: item.rating || 4,
        platform: item.platform,
        roomType: item.roomType || ROOM_TYPES[index % ROOM_TYPES.length],
        policy: item.policy || POLICIES[index % POLICIES.length],
        price: basePrice,
        currency: 'CNY',
        availability: item.availability || 'Available',
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        rooms: params.rooms,
        url: item.url || '#',
        lastUpdated: new Date().toISOString(),
        tags: ['价格日历', '历史最低价'],
        priceCalendar,
        predictedTrend: trend,
        historicLow
      };
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return generateStaticMock(params);
  }
};

export const fetchRealHotelData = async (
  params: SearchParams,
  platformSessions: Record<'Ctrip' | 'Fliggy' | 'Qunar', { isConnected: boolean }>
): Promise<CollectorResult> => {
  console.log('正在从 OTA 平台获取酒店数据...');
  return collectHotelData(params, platformSessions);
};

export const buildAiFallbackResult = async (params: SearchParams, reason: string): Promise<CollectorResult> => {
  return {
    hotels: await generateHotelData(params),
    report: buildFallbackReport(reason)
  };
};
