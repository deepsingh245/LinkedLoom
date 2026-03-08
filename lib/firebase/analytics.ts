import { DashboardData } from "./interfaces";
import { dangerToast } from "../toast";

export const getAnalyticsDashboardData = async (userId: string): Promise<DashboardData | null> => {
  console.log("🚀 ~ getAnalyticsDashboardData ~ userId:", userId)
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/getLinkedInAnalytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    const body = await res.json();
    console.log("🚀 ~ getAnalyticsDashboardData ~ response:", body)
    
    if (res.ok && body.success && body.data) {
      return body.data as DashboardData;
    } else {
      dangerToast("No analytics dashboard data found. Returning default/empty data.");
      return null;
    }
  } catch (e) {
    console.error("Error getting analytics dashboard data: ", e);
    dangerToast("Error getting analytics dashboard data. Please try again later.");
    throw e;
  }
};
