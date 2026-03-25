import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, CreditCard, Webhook, Globe, TestTube, CheckCircle, AlertTriangle, Server, Key, Link } from 'lucide-react';
import { adminApi, type PaymentConfig, type N8nConfig, type DomainConfig } from '../services/adminService';

type AdminSettingsTab = 'payment' | 'n8n' | 'domain';

export function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>('payment');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loading, setLoading] = useState(true);

  // Payment Gateway State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    gateway: 'razorpay',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayWebhookSecret: '',
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    testMode: true,
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // n8n Config State
  const [n8nConfig, setN8nConfig] = useState<N8nConfig>({
    baseUrl: 'https://n8n.todo.skillyak.com',
    apiKey: '',
    webhookBaseUrl: 'https://n8n.todo.skillyak.com/webhook',
    openaiApiKey: '',
    whisperModel: 'whisper-1',
  });

  // Domain Config State
  const [domainConfig, setDomainConfig] = useState<DomainConfig>({
    domain: 'todo.skillyak.com',
    sslEnabled: true,
    apiSubdomain: 'api.todo.skillyak.com',
    n8nSubdomain: 'n8n.todo.skillyak.com',
  });

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getConfig();

      // Populate form fields from config
      setPaymentConfig({
        gateway: (data.paymentGateway as 'razorpay' | 'stripe') || 'razorpay',
        razorpayKeyId: data.razorpayKeyId || '',
        razorpayKeySecret: data.razorpayKeySecret || '',
        razorpayWebhookSecret: data.razorpayWebhookSecret || '',
        stripePublishableKey: data.stripePublishableKey || '',
        stripeSecretKey: data.stripeSecretKey || '',
        stripeWebhookSecret: data.stripeWebhookSecret || '',
        testMode: data.testMode ?? true,
      });

      setN8nConfig({
        baseUrl: data.n8nBaseUrl || 'https://n8n.todo.skillyak.com',
        apiKey: data.n8nApiKey || '',
        webhookBaseUrl: data.n8nWebhookBaseUrl || 'https://n8n.todo.skillyak.com/webhook',
        openaiApiKey: data.openaiApiKey || '',
        whisperModel: data.whisperModel || 'whisper-1',
      });

      setDomainConfig({
        domain: data.primaryDomain || 'todo.skillyak.com',
        sslEnabled: data.sslEnabled ?? true,
        apiSubdomain: data.apiSubdomain || 'api.todo.skillyak.com',
        n8nSubdomain: data.n8nSubdomain || 'n8n.todo.skillyak.com',
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSavePayment = async () => {
    setSaveStatus('saving');
    try {
      await adminApi.updateConfig({
        paymentGateway: paymentConfig.gateway,
        razorpayKeyId: paymentConfig.razorpayKeyId,
        razorpayKeySecret: paymentConfig.razorpayKeySecret,
        razorpayWebhookSecret: paymentConfig.razorpayWebhookSecret,
        stripePublishableKey: paymentConfig.stripePublishableKey,
        stripeSecretKey: paymentConfig.stripeSecretKey,
        stripeWebhookSecret: paymentConfig.stripeWebhookSecret,
        testMode: paymentConfig.testMode,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save payment config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleSaveN8n = async () => {
    setSaveStatus('saving');
    try {
      await adminApi.updateConfig({
        n8nBaseUrl: n8nConfig.baseUrl,
        n8nApiKey: n8nConfig.apiKey,
        n8nWebhookBaseUrl: n8nConfig.webhookBaseUrl,
        openaiApiKey: n8nConfig.openaiApiKey,
        whisperModel: n8nConfig.whisperModel,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save n8n config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleSaveDomain = async () => {
    setSaveStatus('saving');
    try {
      await adminApi.updateConfig({
        primaryDomain: domainConfig.domain,
        apiSubdomain: domainConfig.apiSubdomain,
        n8nSubdomain: domainConfig.n8nSubdomain,
        sslEnabled: domainConfig.sslEnabled,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save domain config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleTestN8nConnection = async () => {
    try {
      const result = await adminApi.testN8nConnection({
        baseUrl: n8nConfig.baseUrl,
        apiKey: n8nConfig.apiKey,
      });
      alert(result.message);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Connection test failed');
    }
  };

  const handleTestPaymentGateway = async () => {
    try {
      const credentials = paymentConfig.gateway === 'razorpay'
        ? { keyId: paymentConfig.razorpayKeyId, keySecret: paymentConfig.razorpayKeySecret }
        : { secretKey: paymentConfig.stripeSecretKey };

      const result = await adminApi.testPaymentGateway({
        gateway: paymentConfig.gateway,
        credentials,
      });
      alert(result.message);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Connection test failed');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'payment' as AdminSettingsTab, label: 'Payment Gateway', icon: CreditCard },
    { id: 'n8n' as AdminSettingsTab, label: 'n8n Automation', icon: Webhook },
    { id: 'domain' as AdminSettingsTab, label: 'Domain & SSL', icon: Globe },
  ];

  const SecretInput = ({ label, value, onChange, field, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; field: string; placeholder: string;
  }) => (
    <div>
      <label htmlFor={field} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="relative">
        <input
          id={field}
          type={showSecrets[field] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 pr-12 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-[var(--color-skai-accent)]/60 focus:ring-1 focus:ring-[var(--color-skai-accent)]/30 transition-all font-mono"
        />
        <button
          type="button"
          onClick={() => toggleSecret(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showSecrets[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  const TextInput = ({ label, value, onChange, placeholder, icon: Icon, disabled }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string; icon?: any; disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={label.replace(/\s+/g, '')} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />}
        <input
          id={label.replace(/\s+/g, '')}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-slate-800/60 border border-slate-700/50 rounded-lg ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-[var(--color-skai-accent)]/60 focus:ring-1 focus:ring-[var(--color-skai-accent)]/30 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">SUPER ADMIN</span>
          <span>System Configuration</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Integration Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure payment gateways, AI automation, and domain settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-slate-800/50 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-[var(--color-skai-card)] text-white shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-3xl">
        {/* ============== PAYMENT GATEWAY TAB ============== */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            {/* Gateway selector */}
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-[var(--color-skai-accent)]" />
                Payment Gateway Provider
              </h3>
              <div className="flex gap-3">
                {(['razorpay', 'stripe'] as const).map((gw) => (
                  <button
                    key={gw}
                    onClick={() => setPaymentConfig({ ...paymentConfig, gateway: gw })}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${paymentConfig.gateway === gw
                      ? 'border-[var(--color-skai-accent)] bg-[var(--color-skai-accent)]/5'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                      }`}
                  >
                    <p className={`font-semibold text-sm ${paymentConfig.gateway === gw ? 'text-[var(--color-skai-accent)]' : 'text-slate-300'}`}>
                      {gw === 'razorpay' ? '🇮🇳 Razorpay' : '🌍 Stripe'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {gw === 'razorpay' ? 'UPI, Cards, Netbanking (India)' : 'Global card payments'}
                    </p>
                  </button>
                ))}
              </div>

              {/* Test Mode Toggle */}
              <div className="mt-4 flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <TestTube size={16} className="text-yellow-500" />
                  <span className="text-sm text-yellow-400 font-medium">Test / Sandbox Mode</span>
                </div>
                <button
                  onClick={() => setPaymentConfig({ ...paymentConfig, testMode: !paymentConfig.testMode })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${paymentConfig.testMode ? 'bg-yellow-500' : 'bg-green-500'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${paymentConfig.testMode ? 'translate-x-0.5' : 'translate-x-5.5'}`} />
                </button>
              </div>
            </div>

            {/* Razorpay Credentials */}
            {paymentConfig.gateway === 'razorpay' && (
              <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-white mb-2">Razorpay API Credentials</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Get your keys from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" className="text-[var(--color-skai-accent)] hover:underline">dashboard.razorpay.com → Settings → API Keys</a>
                </p>
                <TextInput
                  label="Key ID"
                  value={paymentConfig.razorpayKeyId}
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, razorpayKeyId: v })}
                  placeholder={paymentConfig.testMode ? 'rzp_test_xxxxxxxxxxxxxxx' : 'rzp_live_xxxxxxxxxxxxxxx'}
                  icon={Key}
                />
                <SecretInput
                  label="Key Secret"
                  value={paymentConfig.razorpayKeySecret}
                  field="razorpaySecret"
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, razorpayKeySecret: v })}
                  placeholder="Enter your Razorpay Key Secret"
                />
                <SecretInput
                  label="Webhook Secret"
                  value={paymentConfig.razorpayWebhookSecret}
                  field="razorpayWebhook"
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, razorpayWebhookSecret: v })}
                  placeholder="Enter your webhook secret for signature verification"
                />
                <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 border border-slate-700/30">
                  <p className="font-medium text-slate-300 mb-1">Webhook URL (set this in Razorpay Dashboard):</p>
                  <code className="text-[var(--color-skai-accent)]">https://todo.skillyak.com/api/webhooks/razorpay</code>
                </div>
              </div>
            )}

            {/* Stripe Credentials */}
            {paymentConfig.gateway === 'stripe' && (
              <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-white mb-2">Stripe API Credentials</h3>
                <TextInput
                  label="Publishable Key"
                  value={paymentConfig.stripePublishableKey}
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, stripePublishableKey: v })}
                  placeholder={paymentConfig.testMode ? 'pk_test_...' : 'pk_live_...'}
                  icon={Key}
                />
                <SecretInput
                  label="Secret Key"
                  value={paymentConfig.stripeSecretKey}
                  field="stripeSecret"
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, stripeSecretKey: v })}
                  placeholder="sk_test_... or sk_live_..."
                />
                <SecretInput
                  label="Webhook Signing Secret"
                  value={paymentConfig.stripeWebhookSecret}
                  field="stripeWebhook"
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, stripeWebhookSecret: v })}
                  placeholder="whsec_..."
                />
              </div>
            )}

            {/* Save + Test */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSavePayment}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
                disabled={saveStatus === 'saving'}
              >
                <Save size={16} />
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error' : 'Save Payment Settings'}
              </button>
              <button
                onClick={handleTestPaymentGateway}
                className="flex items-center gap-2 border border-slate-600 text-slate-300 px-6 py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <TestTube size={16} /> Test Connection
              </button>
            </div>
          </div>
        )}

        {/* ============== N8N AUTOMATION TAB ============== */}
        {activeTab === 'n8n' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Webhook size={16} className="text-orange-400" />
                n8n Instance Configuration
              </h3>
              <p className="text-xs text-slate-500">
                Connect your self-hosted n8n instance to enable AI voice-to-task, auto-scheduling, and meeting intelligence workflows.
              </p>

              <TextInput
                label="n8n Base URL"
                value={n8nConfig.baseUrl}
                onChange={(v) => setN8nConfig({ ...n8nConfig, baseUrl: v })}
                placeholder="https://n8n.todo.skillyak.com"
                icon={Link}
              />
              <SecretInput
                label="n8n API Key"
                value={n8nConfig.apiKey}
                field="n8nApiKey"
                onChange={(v) => setN8nConfig({ ...n8nConfig, apiKey: v })}
                placeholder="n8n API key (Settings → API → Create API Key)"
              />
              <TextInput
                label="Webhook Base URL"
                value={n8nConfig.webhookBaseUrl}
                onChange={(v) => setN8nConfig({ ...n8nConfig, webhookBaseUrl: v })}
                placeholder="https://n8n.todo.skillyak.com/webhook"
                icon={Server}
              />
            </div>

            {/* AI / OpenAI keys */}
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Key size={16} className="text-emerald-400" />
                AI Provider Keys (used by n8n workflows)
              </h3>
              <p className="text-xs text-slate-500">
                These keys are stored securely and injected into your n8n workflows at runtime.
              </p>

              <SecretInput
                label="OpenAI API Key"
                value={n8nConfig.openaiApiKey}
                field="openaiKey"
                onChange={(v) => setN8nConfig({ ...n8nConfig, openaiApiKey: v })}
                placeholder="sk-proj-..."
              />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Whisper Model</label>
                <select
                  value={n8nConfig.whisperModel}
                  onChange={(e) => setN8nConfig({ ...n8nConfig, whisperModel: e.target.value })}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200 outline-none focus:border-[var(--color-skai-accent)]/60 transition-all"
                >
                  <option value="whisper-1">whisper-1 (Cloud — OpenAI)</option>
                  <option value="whisper-local">whisper.cpp (Self-hosted — Free)</option>
                </select>
              </div>
            </div>

            {/* Workflow status */}
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Workflow Status</h3>
              <div className="space-y-2">
                {[
                  { name: 'Voice → Task → Quadrant', status: 'ready' },
                  { name: 'Meeting Transcription → Action Items', status: 'ready' },
                  { name: 'Daily AI Auto-Planner', status: 'ready' },
                  { name: 'Conflict Resolver & Rescheduler', status: 'ready' },
                  { name: 'Razorpay/Stripe Webhook → Plan Upgrade', status: 'needs_config' },
                ].map((wf) => (
                  <div key={wf.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/30 transition-colors">
                    <span className="text-sm text-slate-300">{wf.name}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${wf.status === 'ready' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                      {wf.status === 'ready' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      {wf.status === 'ready' ? 'Ready' : 'Needs Config'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveN8n}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
                disabled={saveStatus === 'saving'}
              >
                <Save size={16} />
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error' : 'Save n8n Settings'}
              </button>
              <button
                onClick={handleTestN8nConnection}
                className="flex items-center gap-2 border border-slate-600 text-slate-300 px-6 py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <TestTube size={16} /> Test n8n Connection
              </button>
            </div>
          </div>
        )}

        {/* ============== DOMAIN & SSL TAB ============== */}
        {activeTab === 'domain' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Globe size={16} className="text-green-400" />
                Domain Configuration
              </h3>

              <TextInput
                label="Primary Domain"
                value={domainConfig.domain}
                onChange={(v) => setDomainConfig({ ...domainConfig, domain: v })}
                placeholder="todo.skillyak.com"
                icon={Globe}
              />
              <TextInput
                label="API Subdomain"
                value={domainConfig.apiSubdomain}
                onChange={(v) => setDomainConfig({ ...domainConfig, apiSubdomain: v })}
                placeholder="api.todo.skillyak.com"
                icon={Server}
              />
              <TextInput
                label="n8n Subdomain"
                value={domainConfig.n8nSubdomain}
                onChange={(v) => setDomainConfig({ ...domainConfig, n8nSubdomain: v })}
                placeholder="n8n.todo.skillyak.com"
                icon={Webhook}
              />

              {/* SSL Status */}
              <div className={`rounded-lg px-4 py-3 border ${domainConfig.sslEnabled ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {domainConfig.sslEnabled ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                    <span className={`text-sm font-medium ${domainConfig.sslEnabled ? 'text-green-400' : 'text-red-400'}`}>
                      {domainConfig.sslEnabled ? 'SSL/TLS Active (Let\'s Encrypt)' : 'SSL Not Configured'}
                    </span>
                  </div>
                  <button
                    onClick={() => setDomainConfig({ ...domainConfig, sslEnabled: !domainConfig.sslEnabled })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${domainConfig.sslEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${domainConfig.sslEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* DNS Records help */}
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Required DNS Records</h3>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-400 space-y-1.5">
                <div className="flex gap-8">
                  <span className="text-slate-500 w-12">A</span>
                  <span className="text-slate-300">todo.skillyak.com</span>
                  <span className="text-[var(--color-skai-accent)]">→ YOUR_VPS_IP</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-slate-500 w-12">A</span>
                  <span className="text-slate-300">api.todo.skillyak.com</span>
                  <span className="text-[var(--color-skai-accent)]">→ YOUR_VPS_IP</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-slate-500 w-12">A</span>
                  <span className="text-slate-300">n8n.todo.skillyak.com</span>
                  <span className="text-[var(--color-skai-accent)]">→ YOUR_VPS_IP</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveDomain}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
              disabled={saveStatus === 'saving'}
            >
              <Save size={16} />
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error' : 'Save Domain Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
