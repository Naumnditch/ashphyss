import { TutoringBookingManager } from '@/components/admin/TutoringBookingManager';

export default function AdminTutoringBookingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Tutoring Bookings</h1>
      <p className="text-gray-500 text-sm mb-8">
        1-on-1 tutoring session purchases. Bookings paid through the Shopier checkout appear automatically; use the
        form below to record one confirmed a different way (bank transfer, native Shopier link).
      </p>
      <TutoringBookingManager />
    </div>
  );
}
