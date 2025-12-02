// 通过全局变量访问React和相关hooks
const React = (window as any).React;
const { useState } = React;

// 通过全局变量访问Lucide Icons
const { CheckCircle, XCircle, LogIn, Lock, QrCode, Smartphone, RefreshCw, User } = (window as any)["lucide-react"];

import { PlatformStatus } from '../types';
import { CtripLogin } from './CtripLogin';

// 添加携程服务导入
import { loginToCtrip, CtripCredentials } from '../services/ctripService';

interface Props {
  platforms: PlatformStatus[];
  onToggleConnection: (name: 'Ctrip' | 'Fliggy' | 'Qunar', username?: string, password?: string, cookies?: string) => void;
}

export const PlatformManager = ({ platforms, onToggleConnection }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [loginMethod, setLoginMethod] = useState('qr');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  // 添加登录状态
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const handleConnect = async () => {
    if (activeModal === 'Ctrip' && loginMethod === 'account') {
      // 处理携程的真实登录
      setIsLoggingIn(true);
      setLoginError(null);
      
      try {
        const credentials = {
          username,
          password
        };
        
        // 调用携程登录服务
        const session = await loginToCtrip(credentials);
        
        if (session.isLoggedIn) {
          // 登录成功
          const finalUsername = username;
          onToggleConnection(activeModal, finalUsername, password);
          setActiveModal(null);
          resetForm();
        } else {
          // 登录失败
          setLoginError('登录失败，请检查用户名和密码');
        }
      } catch (error) {
        setLoginError('登录过程中发生错误: ' + error.message);
      } finally {
        setIsLoggingIn(false);
      }
    } else {
      // 其他平台或扫码登录保持原有逻辑
      if (activeModal && activeModal !== 'CtripManual') {
        // If QR code, we simulate a scanned username
        const finalUsername = loginMethod === 'qr' ? `${activeModal}_User_${Math.floor(Math.random()*1000)}` : username;
        onToggleConnection(activeModal, finalUsername, password);
        setActiveModal(null);
        resetForm();
      }
    }
  };

  const handleManualLogin = (cookies) => {
    // 处理人工登录获取的cookie
    onToggleConnection('Ctrip', 'Manual User', '', cookies);
    setActiveModal(null);
    resetForm();
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setSmsCode('');
    setLoginMethod('qr');
    setIsLoggingIn(false);
    setLoginError(null);
  };

  return React.createElement(
    'div',
    { className: 'bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6' },
    React.createElement(
      'h2',
      { className: 'text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2' },
      React.createElement(Lock, { className: 'w-5 h-5 text-indigo-600' }),
      '平台自动登录配置'
    ),
    React.createElement(
      'div',
      { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
      platforms.map((p) => 
        React.createElement(
          'div',
          {
            key: p.name,
            className: `
              relative p-4 rounded-lg border transition-all duration-200
              ${p.isConnected ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-indigo-200'}
            `
          },
          React.createElement(
            'div',
            { className: 'flex justify-between items-start' },
            React.createElement(
              'div',
              null,
              React.createElement(
                'h3',
                { className: 'font-medium text-slate-900' },
                p.name === 'Ctrip' ? '携程 Ctrip' : p.name === 'Fliggy' ? '飞猪 Fliggy' : '去哪儿 Qunar'
              ),
              React.createElement(
                'p',
                { className: 'text-xs text-slate-500 mt-1' },
                p.isConnected ? `已连接: ${p.username}` : '未连接 (需授权)'
              ),
              p.lastSync && React.createElement(
                'p',
                { className: 'text-xs text-slate-400 mt-1' },
                'Token有效期: 23h 59m'
              )
            ),
            React.createElement(
              'button',
              {
                onClick: () => {
                  if (p.isConnected) {
                    onToggleConnection(p.name);
                  } else {
                    setActiveModal(p.name);
                  }
                },
                className: `p-2 rounded-full ${p.isConnected ? 'text-green-600 hover:bg-green-100' : 'text-slate-400 hover:bg-slate-100'}`
              },
              p.isConnected ? 
                React.createElement(CheckCircle, { className: 'w-5 h-5' }) : 
                React.createElement(LogIn, { className: 'w-5 h-5' })
            )
          )
        )
      )
    ),

    // Login Modal
    (activeModal === 'Ctrip' || activeModal === 'Fliggy' || activeModal === 'Qunar') && React.createElement(
      'div',
      { className: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4' },
      React.createElement(
        'div',
        { className: 'bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden' },
        React.createElement(
          'div',
          { className: 'flex justify-between items-center p-6 border-b border-gray-100' },
          React.createElement(
            'h3',
            { className: 'text-xl font-bold text-slate-800' },
            '登录 ',
            activeModal
          ),
          React.createElement(
            'button',
            { 
              onClick: () => { setActiveModal(null); resetForm(); }, 
              className: 'text-slate-400 hover:text-slate-600' 
            },
            React.createElement(XCircle, { className: 'w-6 h-6' })
          )
        ),
        
        React.createElement(
          'div',
          { className: 'p-6' },
          // Tabs
          React.createElement(
            'div',
            { className: 'flex bg-gray-100 p-1 rounded-lg mb-6' },
            React.createElement(
              'button',
              {
                onClick: () => setLoginMethod('qr'),
                className: `flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'qr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`
              },
              React.createElement(QrCode, { className: 'w-4 h-4' }),
              ' 扫码安全登录'
            ),
            React.createElement(
              'button',
              {
                onClick: () => setLoginMethod('account'),
                className: `flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'account' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`
              },
              React.createElement(Smartphone, { className: 'w-4 h-4' }),
              ' 账号密码登录'
            ),
            activeModal === 'Ctrip' && React.createElement(
              'button',
              {
                onClick: () => setLoginMethod('manual'),
                className: `flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`
              },
              React.createElement(User, { className: 'w-4 h-4' }),
              ' 人工登录'
            )
          ),

          // 登录错误提示
          loginError && React.createElement(
            'div',
            { className: 'mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm' },
            loginError
          ),

          loginMethod === 'qr' ? React.createElement(
            'div',
            { className: 'flex flex-col items-center justify-center py-4 space-y-4' },
            React.createElement(
              'div',
              { 
                className: 'w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 relative group cursor-pointer', 
                onClick: handleConnect 
              },
              React.createElement(QrCode, { className: 'w-16 h-16 text-slate-300 group-hover:text-indigo-500 transition-colors' }),
              React.createElement(
                'div',
                { className: 'absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity' },
                React.createElement(
                  'span',
                  { className: 'text-sm font-bold text-indigo-600' },
                  '点击模拟扫码'
                )
              )
            ),
            React.createElement(
              'p',
              { className: 'text-sm text-slate-500 text-center' },
              '请使用 ',
              activeModal === 'Ctrip' ? '携程' : activeModal === 'Fliggy' ? '飞猪' : '去哪儿',
              ' APP',
              React.createElement('br', null),
              '扫描二维码以安全登录'
            )
          ) : loginMethod === 'manual' && activeModal === 'Ctrip' ? React.createElement(CtripLogin, { onCookieCaptured: handleManualLogin }) : React.createElement(
            'div',
            { className: 'space-y-4' },
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { className: 'block text-sm font-medium text-slate-700 mb-1' },
                '手机号 / 账号'
              ),
              React.createElement('input', {
                type: 'text',
                value: username,
                onChange: (e) => setUsername(e.target.value),
                className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none',
                placeholder: '请输入手机号',
                disabled: isLoggingIn
              })
            ),
            
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { className: 'block text-sm font-medium text-slate-700 mb-1' },
                '登录密码'
              ),
              React.createElement('input', {
                type: 'password',
                value: password,
                onChange: (e) => setPassword(e.target.value),
                className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none',
                placeholder: '请输入密码',
                disabled: isLoggingIn
              })
            ),

            // Simulated Slider Captcha
            React.createElement(
              'div',
              { className: 'pt-2' },
              React.createElement(
                'div',
                { className: 'w-full h-10 bg-gray-100 rounded-md border border-gray-200 flex items-center px-2 relative overflow-hidden group cursor-pointer select-none' },
                React.createElement(
                  'div',
                  { className: 'absolute left-0 top-0 bottom-0 w-10 bg-white border-r border-gray-300 shadow-sm flex items-center justify-center cursor-ew-resize group-hover:bg-indigo-50' },
                  React.createElement(
                    'span',
                    { className: 'text-gray-400' },
                    '|||'
                  )
                ),
                React.createElement(
                  'span',
                  { className: 'w-full text-center text-xs text-gray-400' },
                  '按住滑块拖动到最右侧完成验证'
                )
              )
            ),

            React.createElement(
              'div',
              { className: 'flex gap-2' },
              React.createElement('input', {
                type: 'text',
                value: smsCode,
                onChange: (e) => setSmsCode(e.target.value),
                placeholder: '短信验证码',
                className: 'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none',
                disabled: isLoggingIn
              }),
              React.createElement(
                'button',
                { 
                  className: 'px-3 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap', 
                  disabled: isLoggingIn 
                },
                '获取验证码'
              )
            ),

            React.createElement(
              'button',
              {
                onClick: handleConnect,
                disabled: !username || !password || isLoggingIn,
                className: 'w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center'
              },
              isLoggingIn ? 
                React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(RefreshCw, { className: 'w-4 h-4 animate-spin mr-2' }),
                  '登录中...'
                ) : '登录并授权'
            )
          )
        )
      )
    )
  );
};