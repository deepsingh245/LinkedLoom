import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { DashboardData } from "./interfaces";
import { Collections } from "./collections";
import { dangerToast } from "../toast";

export const getAnalyticsDashboardData = async (userId: string): Promise<DashboardData | null> => {
  console.log("🚀 ~ getAnalyticsDashboardData frontend query ~ userId:", userId);
  try {
    // 1. Query all posts for this user
    const postsRef = collection(db, Collections.POSTS);
    const q = query(
        postsRef, 
        where("user_id", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);

    let totalPosts = 0;
    let totalDrafts = 0;
    let totalScheduled = 0;
    let totalFailed = 0;

    // 2. Initialize weekly chart data
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const chartDataMap: Record<string, { name: string; posts: number; engagement: number }> = {
      "Mon": { name: "Mon", posts: 0, engagement: 0 },
      "Tue": { name: "Tue", posts: 0, engagement: 0 },
      "Wed": { name: "Wed", posts: 0, engagement: 0 },
      "Thu": { name: "Thu", posts: 0, engagement: 0 },
      "Fri": { name: "Fri", posts: 0, engagement: 0 },
      "Sat": { name: "Sat", posts: 0, engagement: 0 },
      "Sun": { name: "Sun", posts: 0, engagement: 0 },
    };

    // 3. Process all posts
    querySnapshot.forEach((doc) => {
        const post = doc.data();
        const status = (post.status || "").toUpperCase();

        if (status === "PUBLISHED") totalPosts++;
        else if (status === "DRAFT") totalDrafts++;
        else if (status === "SCHEDULED") totalScheduled++;
        else if (status === "FAILED") totalFailed++;
        
        // Only map published posts to the weekly chart
        if (status === "PUBLISHED") {
            let dateObj: Date;
            
            // Handle Firestore Timestamp vs standardized ISO Date strings
            if (post.createdAt?.toDate) {
                dateObj = post.createdAt.toDate();
            } else if (post.createdAt) {
                dateObj = new Date(post.createdAt);
            } else {
                dateObj = new Date(); // Fallback if missing
            }

            const dayName = daysOfWeek[dateObj.getDay()];
            if (chartDataMap[dayName]) {
                chartDataMap[dayName].posts += 1;
            }
        }
    });

    // Convert map to array in standard Mon-Sun order for the chart
    const chartData = [
        chartDataMap["Mon"],
        chartDataMap["Tue"],
        chartDataMap["Wed"],
        chartDataMap["Thu"],
        chartDataMap["Fri"],
        chartDataMap["Sat"],
        chartDataMap["Sun"],
    ];

    // 4. Construct final Dashboard object
    const dashboardData: DashboardData = {
        totalPosts: totalPosts,
        totalDrafts: totalDrafts,
        totalScheduled: totalScheduled,
        totalFailed: totalFailed,
        totalLikes: 0,      // Placeholder for future native implementation
        totalComments: 0,   // Placeholder 
        totalShares: 0,     // Placeholder
        chartData: chartData,
        metrics: {
            impressions: "0",
            followers: "0",
            engagement: "0%",
            views: "0",
        }
    };

    return dashboardData;

  } catch (e) {
    console.error("Error generating analytics dashboard data: ", e);
    dangerToast("Error calculating analytics dashboard data. Please try again later.");
    return null;
  }
};
