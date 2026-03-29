import { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    id: string;
    name: string;
    price: string;
  };
  onPaymentComplete: (success: boolean) => void;
}

export default function CheckoutModal({ isOpen, onClose, plan, onPaymentComplete }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [enabledMethods, setEnabledMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentService.getPaymentMethods();
      setEnabledMethods(methods.enabledMethods);
      if (methods.enabledMethods.length > 0) {
        setSelectedMethod(methods.enabledMethods[0]);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handlePayment = async () => {
    if (!enabledMethods.length || !selectedMethod) return;

    setLoading(true);
    try {
      // Convert price to number (remove $ and /mo)
      const amount = parseFloat(plan.price.replace('$', '').replace('/mo', '')) * 100; // Convert to cents/paise

      const orderResponse = await paymentService.createOrder({
        amount,
        currency: 'USD',
        customerName: customerDetails.name,
        customerEmail: customerDetails.email,
        customerPhone: customerDetails.phone,
        description: `Subscription to ${plan.name}`,
        paymentMethod: selectedMethod,
        metadata: {
          planId: plan.id,
          planName: plan.name,
        },
      });

      if (orderResponse.success && orderResponse.checkoutUrl) {
        // Redirect to payment gateway
        window.location.href = orderResponse.checkoutUrl;
      } else {
        onPaymentComplete(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onPaymentComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodIcons = {
    UPI: '💳',
    CARD: '💳',
    WALLET: '📱',
    NETBANKING: '🏦',
    EMI: '💰',
    BANK_TRANSFER: '🏦',
  };

  const paymentMethodNames = {
    UPI: 'UPI',
    CARD: 'Credit/Debit Card',
    WALLET: 'Digital Wallet',
    NETBANKING: 'Net Banking',
    EMI: 'EMI',
    BANK_TRANSFER: 'Bank Transfer',
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content checkout-modal">
        <div className="modal-header">
          <h2>Complete Your Payment</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="plan-summary">
          <h3>Plan: {plan.name}</h3>
          <p className="price">{plan.price}</p>
        </div>

        <div className="customer-details">
          <h3>Customer Details</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Full Name"
              value={customerDetails.name}
              onChange={(e) => setCustomerDetails(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email Address"
              value={customerDetails.email}
              onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <input
              type="tel"
              placeholder="Phone Number"
              value={customerDetails.phone}
              onChange={(e) => setCustomerDetails(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>

        {enabledMethods.length > 0 && (
          <div className="payment-options">
            <h3>Payment Method</h3>
            <div className="payment-methods">
              {enabledMethods.map(method => (
                <label key={method} className={`payment-method ${selectedMethod === method ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={selectedMethod === method}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                  />
                  <div className="method-content">
                    <span className="method-icon">{paymentMethodIcons[method as keyof typeof paymentMethodIcons] || '💳'}</span>
                    <span className="method-name">{paymentMethodNames[method as keyof typeof paymentMethodNames] || method}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePayment}
            disabled={loading || !selectedMethod || !customerDetails.name || !customerDetails.email}
          >
            {loading ? 'Processing...' : `Pay ${plan.price}`}
          </button>
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: #1E293B;
            border-radius: 12px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            border: 1px solid #334155;
          }

          .modal-header {
            padding: 24px 24px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #e2e8f0;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #94a3b8;
          }

          .plan-summary {
            padding: 24px;
            background: #0F172A;
            margin: 24px;
            margin-top: 12px;
            border-radius: 8px;
          }

          .plan-summary h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #e2e8f0;
          }

          .price {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #06B6D4;
          }

          .customer-details, .payment-options {
            padding: 0 24px;
            margin-bottom: 24px;
          }

          .customer-details h3, .payment-options h3 {
            margin-bottom: 16px;
            font-size: 18px;
            color: #e2e8f0;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #334155;
            border-radius: 6px;
            font-size: 16px;
            background: #0F172A;
            color: #e2e8f0;
            box-sizing: border-box;
          }

          .form-group input::placeholder {
            color: #64748b;
          }

          .payment-methods {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .payment-method {
            display: flex;
            align-items: center;
            padding: 16px;
            border: 2px solid #334155;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            background: #0F172A;
          }

          .payment-method:hover {
            border-color: #06B6D4;
          }

          .payment-method.selected {
            border-color: #06B6D4;
            background: rgba(6, 182, 212, 0.1);
          }

          .payment-method input[type="radio"] {
            margin-right: 12px;
          }

          .method-content {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #e2e8f0;
          }

          .method-icon {
            font-size: 20px;
          }

          .method-name {
            font-weight: 500;
          }

          .modal-actions {
            padding: 24px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-primary {
            background: #06B6D4;
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background: #0891B2;
          }

          .btn-primary:disabled {
            background: #334155;
            cursor: not-allowed;
            color: #64748b;
          }

          .btn-secondary {
            background: #334155;
            color: #e2e8f0;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #475569;
          }
        `}</style>
      </div>
    </div>
  );
}