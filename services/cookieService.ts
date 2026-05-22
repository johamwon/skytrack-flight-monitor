/**
 * Cookie管理服务
 * 用于存储和检索平台登录cookie
 */

// 定义平台cookie存储结构
export interface PlatformCookies {
  Ctrip?: string;
  Fliggy?: string;
  Qunar?: string;
}

// 存储键名
const COOKIE_STORAGE_KEY = 'hotel_monitor_platform_cookies';

/**
 * 保存平台cookie
 * @param platform 平台名称
 * @param cookies cookie字符串
 */
export const savePlatformCookies = (platform: keyof PlatformCookies, cookies: string): void => {
  try {
    // 从localStorage获取现有的cookies
    const storedCookies = localStorage.getItem(COOKIE_STORAGE_KEY);
    const platformCookies: PlatformCookies = storedCookies ? JSON.parse(storedCookies) : {};
    
    // 更新指定平台的cookies
    platformCookies[platform] = cookies;
    
    // 保存回localStorage
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(platformCookies));
    
    console.log(`已保存 ${platform} 的cookie信息`);
  } catch (error) {
    console.error(`保存 ${platform} 的cookie时出错:`, error);
  }
};

/**
 * 获取平台cookie
 * @param platform 平台名称
 * @returns cookie字符串或undefined
 */
export const getPlatformCookies = (platform: keyof PlatformCookies): string | undefined => {
  try {
    const storedCookies = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!storedCookies) return undefined;
    
    const platformCookies: PlatformCookies = JSON.parse(storedCookies);
    return platformCookies[platform];
  } catch (error) {
    console.error(`获取 ${platform} 的cookie时出错:`, error);
    return undefined;
  }
};

/**
 * 删除平台cookie
 * @param platform 平台名称
 */
export const removePlatformCookies = (platform: keyof PlatformCookies): void => {
  try {
    const storedCookies = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!storedCookies) return;
    
    const platformCookies: PlatformCookies = JSON.parse(storedCookies);
    delete platformCookies[platform];
    
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(platformCookies));
    console.log(`已删除 ${platform} 的cookie信息`);
  } catch (error) {
    console.error(`删除 ${platform} 的cookie时出错:`, error);
  }
};

/**
 * 清空所有平台cookie
 */
export const clearAllPlatformCookies = (): void => {
  try {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
    console.log('已清空所有平台的cookie信息');
  } catch (error) {
    console.error('清空所有平台cookie时出错:', error);
  }
};

/**
 * 检查平台是否有有效的cookie
 * @param platform 平台名称
 * @returns boolean
 */
export const hasValidCookies = (platform: keyof PlatformCookies): boolean => {
  const cookies = getPlatformCookies(platform);
  return !!cookies && cookies.length > 0;
};