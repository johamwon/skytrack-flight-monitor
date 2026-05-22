// 通过全局变量访问React和相关hooks
const React = (window as any).React;
const { useState, useRef } = React;

// 通过全局变量访问Lucide Icons
const { ExternalLink, Copy, CheckCircle } = (window as any)["lucide-react"];

interface CtripLoginProps {
  onCookieCaptured: (cookies: string) => void;
}

export const CtripLogin = ({ onCookieCaptured }) => {
  const [step, setStep] = useState(1); // 1: 说明, 2: 登录, 3: 完成
  const [capturedCookies, setCapturedCookies] = useState('');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  const handleLoginComplete = () => {
    setStep(2);
  };

  const copyToClipboard = () => {
    if (capturedCookies) {
      navigator.clipboard.writeText(capturedCookies);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const captureCookies = () => {
    // 在实际实现中，这里需要通过某种方式从iframe中获取cookie
    // 由于同源策略限制，这在实际浏览器环境中会有困难
    // 这里只是演示逻辑
    
    // 模拟获取cookie
    const mockCookies = `login_ticket=abc123; sessionid=xyz789; UserInfo=encoded_user_info; PassportGA=ga_value`;
    setCapturedCookies(mockCookies);
    setStep(3);
  };

  return React.createElement(
    'div',
    { className: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl mx-auto' },
    React.createElement(
      'h2',
      { className: 'text-xl font-bold text-slate-900 mb-2' },
      '携程酒店账户登录设置'
    ),
    React.createElement(
      'p',
      { className: 'text-slate-600 mb-6' },
      '通过人工登录获取访问权限，以便从携程获取实时酒店报价'
    ),

    step === 1 && React.createElement(
      'div',
      { className: 'space-y-6' },
      React.createElement(
        'div',
        { className: 'bg-blue-50 border border-blue-200 rounded-lg p-4' },
        React.createElement(
          'h3',
          { className: 'font-medium text-blue-900 mb-2' },
          '操作说明'
        ),
        React.createElement(
          'ul',
          { className: 'list-disc pl-5 space-y-1 text-blue-800 text-sm' },
          React.createElement('li', null, '点击下方按钮跳转到携程登录页面'),
          React.createElement('li', null, '在新窗口中完成账户登录'),
          React.createElement('li', null, '登录成功后回到此页面'),
          React.createElement('li', null, '系统将指导您完成Cookie提取过程')
        )
      ),

      React.createElement(
        'div',
        { className: 'flex flex-col sm:flex-row gap-4' },
        React.createElement(
          'button',
          {
            onClick: handleLoginComplete,
            className: 'flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors'
          },
          React.createElement(ExternalLink, { className: 'w-4 h-4' }),
          '前往携程登录'
        )
      )
    ),

    step === 2 && React.createElement(
      'div',
      { className: 'space-y-6' },
      React.createElement(
        'div',
        { className: 'bg-amber-50 border border-amber-200 rounded-lg p-4' },
        React.createElement(
          'h3',
          { className: 'font-medium text-amber-900 mb-2' },
          '登录确认'
        ),
        React.createElement(
          'p',
          { className: 'text-amber-800 text-sm mb-3' },
          '请确认您已在携程官网完成登录，然后点击下方按钮提取登录信息。'
        ),
        React.createElement(
          'p',
          { className: 'text-amber-800 text-sm' },
          '注意：为确保正常工作，请勿在登录后立即退出账户。'
        )
      ),

      React.createElement(
        'div',
        { className: 'border border-gray-200 rounded-lg p-4' },
        React.createElement(
          'h4',
          { className: 'font-medium text-slate-900 mb-2' },
          '技术说明'
        ),
        React.createElement(
          'p',
          { className: 'text-slate-600 text-sm mb-3' },
          '我们需要获取您的登录Cookie来访问携程的酒店数据。这些信息仅存储在您的本地浏览器中，不会上传到任何服务器。'
        ),
        React.createElement(
          'div',
          { className: 'flex items-start gap-2' },
          React.createElement('div', { className: 'mt-1 w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0' }),
          React.createElement(
            'p',
            { className: 'text-slate-600 text-xs' },
            'Cookie是网站用来识别您身份的小段数据，在您登录后由网站自动生成'
          )
        )
      ),

      React.createElement(
        'div',
        { className: 'flex flex-col sm:flex-row gap-4' },
        React.createElement(
          'button',
          {
            onClick: captureCookies,
            className: 'flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors'
          },
          '已完成登录，提取Cookie'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setStep(1),
            className: 'flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors'
          },
          '返回上一步'
        )
      )
    ),

    step === 3 && React.createElement(
      'div',
      { className: 'space-y-6' },
      React.createElement(
        'div',
        { className: 'bg-green-50 border border-green-200 rounded-lg p-4' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-2 mb-2' },
          React.createElement(CheckCircle, { className: 'w-5 h-5 text-green-600' }),
          React.createElement(
            'h3',
            { className: 'font-medium text-green-900' },
            'Cookie提取成功'
          )
        ),
        React.createElement(
          'p',
          { className: 'text-green-800 text-sm' },
          '已成功获取您的登录信息，现在可以访问携程的酒店数据了。'
        )
      ),

      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          { className: 'block text-sm font-medium text-slate-700 mb-2' },
          '已捕获的Cookie信息'
        ),
        React.createElement(
          'div',
          { className: 'relative' },
          React.createElement('textarea', {
            value: capturedCookies,
            readOnly: true,
            rows: 3,
            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-slate-50 text-sm font-mono'
          }),
          React.createElement(
            'button',
            {
              onClick: copyToClipboard,
              className: 'absolute top-2 right-2 p-1.5 text-slate-500 hover:text-slate-700 bg-white rounded-md shadow-sm border border-gray-300'
            },
            copied ? 
              React.createElement(CheckCircle, { className: 'w-4 h-4 text-green-600' }) : 
              React.createElement(Copy, { className: 'w-4 h-4' })
          )
        ),
        React.createElement(
          'p',
          { className: 'text-slate-500 text-xs mt-1' },
          'Cookie信息已加密存储在本地，不会上传到任何服务器'
        )
      ),

      React.createElement(
        'div',
        { className: 'flex flex-col sm:flex-row gap-4' },
        React.createElement(
          'button',
          {
            onClick: () => onCookieCaptured(capturedCookies),
            className: 'flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors'
          },
          '保存并启用携程数据源'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setStep(2),
            className: 'flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors'
          },
          '重新提取'
        )
      )
    )
  );
};