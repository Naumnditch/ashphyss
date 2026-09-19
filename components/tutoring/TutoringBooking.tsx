'use client';

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics/client';

export function TutoringBooking({ addonSlug, price }: { addonSlug: string; price: number }) {
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (fields && paymentUrl && formRef.current) {
      setRedirecting(true);
      formRef.current.submit();
    }
  }, [fields, paymentUrl]);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    trackEvent({ eventType: 'subscribe_click', metadata: { addon: addonSlug } });
    try {
      const res = await fetch('/api/payments/shopier/addon-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonSlug }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not start checkout');
        setLoading(false);
        return;
      }
      setFields(data.fields);
      setPaymentUrl(data.paymentUrl);
    } catch {
      setError('Network error — please try again');
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
      >
        {redirecting ? 'Redirecting to Shopier…' : loading ? 'Starting checkout…' : `Book & Pay ${price.toFixed(0)} TRY`}
      </button>

      {fields && paymentUrl && (
        <form ref={formRef} action={paymentUrl} method="POST" className="hidden">
          {Object.entries(fields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}
    </div>
  );
}
