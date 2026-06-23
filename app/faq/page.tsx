import { redirect } from 'next/navigation'

// The standalone FAQ page has been retired — FAQ content now lives on the
// homepage and every competition page. This route now points to About Us.
export default function FAQPage() {
  redirect('/about')
}
