import { redirect } from 'next/navigation'

// The "Closed Draws" archive has been replaced by the branded Past Winners page.
// Keep this route working by permanently forwarding it.
export default function ClosedDrawsPage() {
  redirect('/past-winners')
}
