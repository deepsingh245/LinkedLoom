import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DashboardData } from "./interfaces";
import { Collections } from "./collections";
import { dangerToast } from "../toast";

export const getAnalyticsDashboardData = async (userId: string): Promise<DashboardData | null> => {
  try {
    const docRef = doc(db, Collections.ANALYTICS, userId, "dashboard", "data");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DashboardData;
    } else {
      console.log("No analytics dashboard data found. Returning default/empty data.");
      dangerToast("No analytics dashboard data found. Returning default/empty data.");
      return null;
    }
  } catch (e) {
    console.error("Error getting analytics dashboard data: ", e);
    dangerToast("Error getting analytics dashboard data. Please try again later.");
    throw e;
  }
};
