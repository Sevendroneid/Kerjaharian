import { ReactNode } from 'react';

// TEMPORARY OWNER-ONLY INSPECTION MODE. The route is reachable only from
// the hidden /rahasia entry point in App.tsx; no OTP/session is requested.
export default function AdminRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
