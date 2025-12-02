import { Flight, SearchParams } from "../types";

// 导入携程服务
import { fetchCtripFlightData } from "./ctripService";

// In a real scenario, the API key should be securely managed.
// For this demo, we assume it's available in process.env
declare var process: {
  env: {
    API_KEY?: string;
  };
};

const apiKey = process.env.API_KEY || ''; 

export const generateFlightData = async (params: SearchParams): Promise<Flight[]> => {
  if (!apiKey) {
    console.warn("No API Key provided, returning static mock data.");
    return generateStaticMock(params);
  }

  try {
    // 通过全局变量访问Google Generative AI库
    const GoogleGenerativeAI = (window as any).google?.generativeAI?.GoogleGenerativeAI;
    if (!GoogleGenerativeAI) {
      throw new Error("Google Generative AI library not available");
    }
    
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      Generate 5 realistic flight options from ${params.origin} to ${params.destination} for the date ${params.date}.
      Imagine you are scraping data from Ctrip, Fliggy, and Qunar.
      Include a mix of airlines (Air China, China Eastern, Southern, Hainan).
      
      Strictly follow the JSON schema.
      Generate realistic prices in CNY (Chinese Yuan) between 500 and 2000.
      Vary the prices slightly to simulate real-time fluctuation.
    `;

    const config = {
      responseMimeType: "application/json",
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: config
    });

    const rawData = JSON.parse(result.response.text() || "[]");

    // Augment with IDs and URLs
    return rawData.map((f: any, index: number) => ({
      ...f,
      id: `${f.flightNumber}-${index}-${Date.now()}`,
      origin: params.origin,
      destination: params.destination,
      url: '#', // Mock URL
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    return generateStaticMock(params);
  }
};

// Fallback if API fails or no key
const generateStaticMock = (params: SearchParams): Flight[] => {
  const platforms: ('Ctrip' | 'Fliggy' | 'Qunar')[] = ['Ctrip', 'Fliggy', 'Qunar'];
  const airlines = ['Air China', 'China Eastern', 'Hainan Airlines'];
  
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `MOCK-${i}`,
    airline: airlines[i % airlines.length],
    flightNumber: `CA12${i}`,
    departureTime: "10:00",
    arrivalTime: "13:00",
    origin: params.origin,
    destination: params.destination,
    price: 800 + Math.floor(Math.random() * 400),
    platform: platforms[i % platforms.length],
    url: '#'
  }));
};

/**
 * 从真实平台获取航班数据
 * @param params 搜索参数
 * @param platformSessions 各平台会话信息
 * @returns 航班数据数组
 */
export const fetchRealFlightData = async (params: SearchParams, platformSessions: any): Promise<Flight[]> => {
  console.log("正在从真实平台获取航班数据...");
  
  const allFlights: Flight[] = [];
  
  // 如果携程已连接，获取真实数据
  if (platformSessions.Ctrip && platformSessions.Ctrip.isConnected) {
    try {
      const ctripFlights = await fetchCtripFlightData(params, platformSessions.Ctrip.session);
      allFlights.push(...ctripFlights);
      console.log(`成功从携程获取 ${ctripFlights.length} 条航班数据`);
    } catch (error) {
      console.error("获取携程航班数据失败:", error);
    }
  }
  
  // 如果其他平台已连接，也可以类似处理
  // 这里可以添加飞猪、去哪儿的逻辑
  
  // 如果没有任何平台连接，回退到模拟数据
  if (allFlights.length === 0) {
    console.log("未连接任何平台，使用模拟数据");
    return generateStaticMock(params);
  }
  
  return allFlights;
};