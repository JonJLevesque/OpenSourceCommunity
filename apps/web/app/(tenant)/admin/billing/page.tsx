import { redirect } from 'next/navigation'

// Billing is not part of the open-source platform.
// Redirect anyone who lands here back to the admin overview.
export default function BillingPage() {
  redirect('/admin')
}
