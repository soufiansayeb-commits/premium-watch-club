import { redirect } from 'next/navigation'

// FAQ content lives on the homepage and every competition page.
// /faq and /about both redirect to the canonical About Us page.
export default function FAQPage() {
  redirect('/about-us')
}
