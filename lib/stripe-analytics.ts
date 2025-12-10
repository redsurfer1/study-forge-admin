import "server-only"

import { stripe } from "./stripe"

export interface SubscriptionAnalytics {
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  scheduledCancellations: number
  monthlyRecurringRevenue: number
  previousMonthMRR: number
  mrrGrowthPercentage: number
  churnRate: number
  newSubscriptionsThisMonth: number
  canceledThisMonth: number
}

export async function getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
  try {
    // Get current date and previous month date
    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch all active subscriptions
    const activeSubscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    })

    // Fetch trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
    })

    // Fetch canceled subscriptions
    const canceledSubscriptions = await stripe.subscriptions.list({
      status: "canceled",
      limit: 100,
    })

    // Count subscriptions scheduled for cancellation (cancel_at_period_end = true)
    const scheduledCancellations = activeSubscriptions.data.filter((sub) => sub.cancel_at_period_end).length

    // Calculate Monthly Recurring Revenue (MRR) from active subscriptions
    let currentMRR = 0
    activeSubscriptions.data.forEach((sub) => {
      sub.items.data.forEach((item) => {
        if (item.price.recurring?.interval === "month") {
          currentMRR += (item.price.unit_amount || 0) * item.quantity
        } else if (item.price.recurring?.interval === "year") {
          // Convert annual to monthly
          currentMRR += ((item.price.unit_amount || 0) * item.quantity) / 12
        }
      })
    })
    currentMRR = currentMRR / 100 // Convert from cents to dollars

    // Fetch subscriptions created this month
    const newSubscriptionsThisMonth = await stripe.subscriptions.list({
      created: {
        gte: Math.floor(startOfCurrentMonth.getTime() / 1000),
      },
      limit: 100,
    })

    // Stripe API doesn't support canceled_at as a query parameter
    const startOfCurrentMonthTimestamp = Math.floor(startOfCurrentMonth.getTime() / 1000)
    const canceledThisMonthCount = canceledSubscriptions.data.filter((sub) => {
      return sub.canceled_at && sub.canceled_at >= startOfCurrentMonthTimestamp
    }).length

    // Fetch subscriptions from previous month for comparison
    const previousMonthSubscriptions = await stripe.subscriptions.list({
      created: {
        gte: Math.floor(startOfPreviousMonth.getTime() / 1000),
        lte: Math.floor(endOfPreviousMonth.getTime() / 1000),
      },
      limit: 100,
    })

    // Calculate previous month MRR (simplified - using count * average price)
    const avgSubscriptionValue = currentMRR / (activeSubscriptions.data.length || 1)
    const previousMonthMRR = previousMonthSubscriptions.data.length * avgSubscriptionValue

    // Calculate MRR growth percentage
    const mrrGrowthPercentage = previousMonthMRR > 0 ? ((currentMRR - previousMonthMRR) / previousMonthMRR) * 100 : 0

    // Calculate churn rate (canceled this month / active at start of month)
    const activeAtStartOfMonth = activeSubscriptions.data.length + canceledThisMonthCount
    const churnRate = activeAtStartOfMonth > 0 ? (canceledThisMonthCount / activeAtStartOfMonth) * 100 : 0

    return {
      activeSubscriptions: activeSubscriptions.data.length,
      trialingSubscriptions: trialingSubscriptions.data.length,
      canceledSubscriptions: canceledSubscriptions.data.length,
      scheduledCancellations,
      monthlyRecurringRevenue: currentMRR,
      previousMonthMRR,
      mrrGrowthPercentage,
      churnRate,
      newSubscriptionsThisMonth: newSubscriptionsThisMonth.data.length,
      canceledThisMonth: canceledThisMonthCount,
    }
  } catch (error) {
    console.error("Error fetching Stripe analytics:", error)
    // Return default values if Stripe API fails
    return {
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      canceledSubscriptions: 0,
      scheduledCancellations: 0,
      monthlyRecurringRevenue: 0,
      previousMonthMRR: 0,
      mrrGrowthPercentage: 0,
      churnRate: 0,
      newSubscriptionsThisMonth: 0,
      canceledThisMonth: 0,
    }
  }
}
