import { doc, getDoc } from "firebase/firestore";
import { db } from "./utils";
import { DashboardData } from "./interfaces";
import { Collections } from "./collections";

export const getAnalyticsDashboardData = async (userId: string): Promise<DashboardData | null> => {
  try {
    // ... comments ...
    const docRef = doc(db, Collections.ANALYTICS, userId, "dashboard", "data");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DashboardData;
    } else {
      console.log("No analytics dashboard data found. Returning default/empty data.");
      // Return a default structure or null depending on component needs. 
      // AnalyticsView expects chartData and metrics. 
      // Let's return null here and handle fallback in component or return a default object.
      return null;
    }
  } catch (e) {
    console.error("Error getting analytics dashboard data: ", e);
    throw e;
  }
};
