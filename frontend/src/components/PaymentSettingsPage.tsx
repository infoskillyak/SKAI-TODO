import { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import type { PaymentConfig, BankConfig, GlobalPaymentProvider, PaymentTransaction } from '../services/paymentService';

interface Props {
    userRole: string;
}

export default function PaymentSettingsPage({ userRole }: Props) {
    const [activeTab, setActiveTab] = useState<'providers' | 'bank' | 'transactions'>('providers');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Payment Provider Config
    const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
    const [selectedProvider, setSelectedProvider] = useState('RAZORPAY');
    const [keyId, setKeyId] = useState('');
    const [keySecret, setKeySecret] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [enabledMethods, setEnabledMethods] = useState<string[]>([]);
    const [isActive, setIsActive] = useState(false);

    // Bank Transfer Config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_bankConfig, setBankConfig] = useState<BankConfig | null>(null);
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [branchName, setBranchName] = useState('');
    const [bankInstructions, setBankInstructions] = useState('');
    const [bankIsActive, setBankIsActive] = useState(true);

    // Transactions
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

    // Global Providers (Super Admin only)
    const [globalProviders, setGlobalProviders] = useState<GlobalPaymentProvider[]>([]);

    useEffect(() => {
        loadPaymentConfig();
        loadBankConfig();
        loadTransactions();
        if (userRole === 'SUPERADMIN') {
            loadGlobalProviders();
        }
    }, [userRole]);

    const loadPaymentConfig = async () => {
        try {
            const config = await paymentService.getPaymentConfig();
            setPaymentConfig(config);
            if (config) {
                setSelectedProvider(config.provider);
                setEnabledMethods(config.enabledMethods);
                setIsActive(config.isActive);
            }
        } catch (error) {
            console.error('Error loading payment config:', error);
        }
    };

    const loadBankConfig = async () => {
        try {
            const config = await paymentService.getBankConfig();
            setBankConfig(config);
            if (config) {
                setBankName(config.bankName);
                setAccountHolderName(config.accountHolderName);
                setIfscCode(config.ifscCode);
                setBranchName(config.branchName || '');
                setBankInstructions(config.instructions || '');
                setBankIsActive(config.isActive);
            }
        } catch (error) {
            console.error('Error loading bank config:', error);
        }
    };

    const loadTransactions = async () => {
        try {
            const txs = await paymentService.getTransactions();
            setTransactions(txs);
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    const loadGlobalProviders = async () => {
        try {
            const providers = await paymentService.getGlobalProviders();
            setGlobalProviders(providers);
        } catch (error) {
            console.error('Error loading global providers:', error);
        }
    };

    const savePaymentConfig = async () => {
        setLoading(true);
        setMessage(null);
        try {
            await paymentService.updatePaymentConfig({
                provider: selectedProvider,
                keyId: keyId || undefined,
                keySecret: keySecret || undefined,
                webhookSecret: webhookSecret || undefined,
                isActive,
                enabledMethods,
            });
            setMessage({ type: 'success', text: 'Payment configuration saved successfully' });
            loadPaymentConfig();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save configuration' });
        } finally {
            setLoading(false);
        }
    };

    const testPaymentConfig = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const result = await paymentService.testPaymentConfig();
            setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Test failed' });
        } finally {
            setLoading(false);
        }
    };

    const saveBankConfig = async () => {
        setLoading(true);
        setMessage(null);
        try {
            await paymentService.updateBankConfig({
                bankName,
                accountNumber,
                accountHolderName,
                ifscCode,
                branchName,
                isActive: bankIsActive,
                instructions: bankInstructions,
            });
            setMessage({ type: 'success', text: 'Bank configuration saved successfully' });
            loadBankConfig();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save bank configuration' });
        } finally {
            setLoading(false);
        }
    };

    const updateGlobalProvider = async (name: string, isEnabled: boolean) => {
        try {
            await paymentService.updateGlobalProvider(name, { isEnabled });
            loadGlobalProviders();
            setMessage({ type: 'success', text: 'Provider updated successfully' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update provider' });
        }
    };

    const handleMethodToggle = (method: string) => {
        setEnabledMethods(prev =>
            prev.includes(method)
                ? prev.filter(m => m !== method)
                : [...prev, method]
        );
    };

    const paymentMethods = ['UPI', 'CARD', 'WALLET', 'NETBANKING', 'EMI', 'BANK_TRANSFER'];

    const providerOptions = [
        { value: 'RAZORPAY', label: 'Razorpay' },
        { value: 'PHONEPE', label: 'PhonePe' },
        { value: 'CASHFREE', label: 'Cashfree' },
        { value: 'UPI', label: 'Direct UPI' },
        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    ];

    return (
        <div className="payment-settings">
            <h2>Payment Settings</h2>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'providers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('providers')}
                >
                    Payment Providers
                </button>
                <button
                    className={`tab ${activeTab === 'bank' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bank')}
                >
                    Bank Transfer
                </button>
                <button
                    className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    Transactions
                </button>
            </div>

            {/* Payment Providers Tab */}
            {activeTab === 'providers' && (
                <div className="tab-content">
                    {userRole === 'SUPERADMIN' && (
                        <div className="section">
                            <h3>Global Provider Settings</h3>
                            <p className="text-muted">Enable or disable payment providers globally</p>

                            <div className="provider-list">
                                {globalProviders.map(provider => (
                                    <div key={provider.name} className="provider-item">
                                        <div className="provider-info">
                                            <strong>{provider.displayName}</strong>
                                            <span className="provider-methods">
                                                {provider.supportedMethods.join(', ')}
                                            </span>
                                        </div>
                                        <label className="toggle">
                                            <input
                                                type="checkbox"
                                                checked={provider.isEnabled}
                                                onChange={(e) => updateGlobalProvider(provider.name, e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="section">
                        <h3>Tenant Configuration</h3>
                        <p className="text-muted">Configure your organization's payment settings</p>

                        <div className="form-group">
                            <label>Payment Provider</label>
                            <select
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value)}
                                disabled={userRole !== 'ADMIN' && userRole !== 'SUPERADMIN'}
                            >
                                {providerOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>API Key ID</label>
                            <input
                                type="text"
                                value={keyId}
                                onChange={(e) => setKeyId(e.target.value)}
                                placeholder="Enter API Key ID"
                            />
                        </div>

                        <div className="form-group">
                            <label>API Key Secret</label>
                            <input
                                type="password"
                                value={keySecret}
                                onChange={(e) => setKeySecret(e.target.value)}
                                placeholder="Enter API Key Secret"
                            />
                        </div>

                        <div className="form-group">
                            <label>Webhook Secret</label>
                            <input
                                type="password"
                                value={webhookSecret}
                                onChange={(e) => setWebhookSecret(e.target.value)}
                                placeholder="Enter Webhook Secret"
                            />
                        </div>

                        <div className="form-group">
                            <label>Enabled Payment Methods</label>
                            <div className="checkbox-group">
                                {paymentMethods.map(method => (
                                    <label key={method} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={enabledMethods.includes(method)}
                                            onChange={() => handleMethodToggle(method)}
                                        />
                                        <span>{method}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                                <span>Enable Payments</span>
                            </label>
                        </div>

                        <div className="button-group">
                            <button
                                className="btn btn-primary"
                                onClick={savePaymentConfig}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={testPaymentConfig}
                                disabled={loading}
                            >
                                Test Configuration
                            </button>
                        </div>

                        {paymentConfig?.lastTestedAt && (
                            <div className="test-status">
                                Last tested: {new Date(paymentConfig.lastTestedAt).toLocaleString()}
                                - Status: {paymentConfig.lastTestStatus}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bank Transfer Tab */}
            {activeTab === 'bank' && (
                <div className="tab-content">
                    <div className="section">
                        <h3>Bank Transfer Configuration</h3>
                        <p className="text-muted">Configure bank transfer details for manual payments</p>

                        <div className="form-group">
                            <label>Bank Name</label>
                            <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="Enter bank name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Account Number</label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="Enter account number"
                            />
                        </div>

                        <div className="form-group">
                            <label>Account Holder Name</label>
                            <input
                                type="text"
                                value={accountHolderName}
                                onChange={(e) => setAccountHolderName(e.target.value)}
                                placeholder="Enter account holder name"
                            />
                        </div>

                        <div className="form-group">
                            <label>IFSC Code</label>
                            <input
                                type="text"
                                value={ifscCode}
                                onChange={(e) => setIfscCode(e.target.value)}
                                placeholder="Enter IFSC code"
                            />
                        </div>

                        <div className="form-group">
                            <label>Branch Name</label>
                            <input
                                type="text"
                                value={branchName}
                                onChange={(e) => setBranchName(e.target.value)}
                                placeholder="Enter branch name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Instructions for Customer</label>
                            <textarea
                                value={bankInstructions}
                                onChange={(e) => setBankInstructions(e.target.value)}
                                placeholder="Enter payment instructions for customers"
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={bankIsActive}
                                    onChange={(e) => setBankIsActive(e.target.checked)}
                                />
                                <span>Enable Bank Transfer</span>
                            </label>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={saveBankConfig}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Bank Configuration'}
                        </button>
                    </div>
                </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
                <div className="tab-content">
                    <div className="section">
                        <h3>Payment Transactions</h3>

                        {transactions.length === 0 ? (
                            <p className="text-muted">No transactions found</p>
                        ) : (
                            <table className="transactions-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Method</th>
                                        <th>Provider</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                            <td>{tx.currency} {tx.amount.toFixed(2)}</td>
                                            <td>
                                                <span className={`status status-${tx.status.toLowerCase()}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td>{tx.paymentMethod || '-'}</td>
                                            <td>{tx.provider}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            <style>{`
        .payment-settings {
          padding: 20px;
        }
        
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .tab {
          padding: 10px 20px;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        
        .tab.active {
          border-bottom-color: #007bff;
          color: #007bff;
        }
        
        .section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .checkbox-group {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .alert {
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .alert-success {
          background: #d4edda;
          color: #155724;
        }
        
        .alert-error {
          background: #f8d7da;
          color: #721c24;
        }
        
        .provider-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .provider-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .provider-info {
          display: flex;
          flex-direction: column;
        }
        
        .provider-methods {
          font-size: 12px;
          color: #666;
        }
        
        .toggle {
          position: relative;
          width: 50px;
          height: 24px;
        }
        
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 24px;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }
        
        input:checked + .slider {
          background-color: #007bff;
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        .transactions-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .transactions-table th,
        .transactions-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .status-success { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-refunded { background: #cce5ff; color: #004085; }
        
        .test-status {
          margin-top: 10px;
          font-size: 12px;
          color: #666;
        }
        
        .text-muted {
          color: #666;
          font-size: 14px;
        }
      `}</style>
        </div>
    );
}
