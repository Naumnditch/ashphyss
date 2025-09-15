import { Suspense } from 'react';
import { BookingProvider } from '@/components/booking/BookingContext';
import { BookingPageContent } from '@/components/booking/BookingPageContent';

export default function BookPage() {
  return (
    <BookingProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <BookingPageContent />
      </Suspense>
    </BookingProvider>
  );
}


