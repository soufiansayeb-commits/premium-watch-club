import { NextRequest, NextResponse } from 'next/server'
import { getCompetitionBySlug } from '@/lib/competition-data'

interface AddToCartBody {
  productId: number
  quantity: number
  competitionSlug?: string
}

function buildCheckoutUrl(productId: number, quantity: number): string {
  const base =
    process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL ||
    'https://premiumwatchclub3471.live-website.com/checkout/'
  try {
    const url = new URL(base)
    url.searchParams.set('add-to-cart', String(productId))
    url.searchParams.set('quantity', String(quantity))
    return url.toString()
  } catch {
    return `${base}?add-to-cart=${productId}&quantity=${quantity}`
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<AddToCartBody>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const { productId, quantity, competitionSlug } = body

  // Validate productId
  if (
    !productId ||
    typeof productId !== 'number' ||
    !Number.isInteger(productId) ||
    productId <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Checkout is not connected for this competition yet. No valid product ID configured.',
      },
      { status: 400 }
    )
  }

  // Validate quantity
  const qty = Math.floor(Number(quantity ?? 1))
  if (!qty || qty < 1) {
    return NextResponse.json(
      { success: false, error: 'Quantity must be at least 1.' },
      { status: 400 }
    )
  }

  // Enforce per-competition max tickets if slug provided
  if (competitionSlug) {
    const comp = getCompetitionBySlug(competitionSlug)
    if (comp && qty > comp.maxTicketsPerPurchase) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${comp.maxTicketsPerPurchase} ticket${comp.maxTicketsPerPurchase === 1 ? '' : 's'} allowed per purchase for this competition.`,
        },
        { status: 400 }
      )
    }
  }

  // TODO: WooCommerce Store API integration — replace URL-based add-to-cart with proper cart session
  //   Step 1: POST /wp-json/wc/store/v1/cart/add-item { id: productId, quantity: qty }
  //   Step 2: Read the Nonce from response headers (Nonce: <token>)
  //   Step 3: Store nonce in a server-side session / cookie for cart continuity
  //   Step 4: Return the checkout URL for the client to redirect on "Continue to Checkout"
  //   This keeps WooCommerce credentials server-side only.

  // TODO analytics: server-side add_to_cart event (GA4 Measurement Protocol / Segment)

  const checkoutUrl = buildCheckoutUrl(productId, qty)

  return NextResponse.json({
    success: true,
    productId,
    quantity: qty,
    checkoutUrl,
  })
}
