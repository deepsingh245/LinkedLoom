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
    
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    
    let postsThisWeek = 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
        
        let dateObj: Date;
        if (post.createdAt?.toDate) {
            dateObj = post.createdAt.toDate();
        } else if (post.createdAt) {
            dateObj = new Date(post.createdAt);
        } else {
            dateObj = new Date();
        }

        if (dateObj > oneWeekAgo) {
            postsThisWeek++;
        }

        // Aggregate metrics
        totalViews += (post.views || 0);
        totalLikes += (post.likes || 0);
        totalComments += (post.comments || 0);
        totalShares += (post.shares || 0);

        // Only map published posts to the weekly chart
        if (status === "PUBLISHED") {
            const dayName = daysOfWeek[dateObj.getDay()];
            if (chartDataMap[dayName]) {
                chartDataMap[dayName].posts += 1;
                chartDataMap[dayName].engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
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

    const totalEngagement = totalLikes + totalComments + totalShares;
    const engagementRate = totalViews > 0 
        ? ((totalEngagement / totalViews) * 100).toFixed(1) 
        : "0.0";

    // 4. Construct final Dashboard object
    const dashboardData: DashboardData = {
        totalPosts: totalPosts,
        totalDrafts: totalDrafts,
        totalScheduled: totalScheduled,
        totalFailed: totalFailed,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: totalShares,
        postsThisWeek: postsThisWeek,
        chartData: chartData,
        metrics: {
            impressions: totalViews.toString(), 
            followers: "0", 
            engagement: `${engagementRate}%`,
            views: totalViews.toString(),
        }
    };

    return dashboardData;

  } catch (e) {
    console.error("Error generating analytics dashboard data: ", e);
    dangerToast("Error calculating analytics dashboard data. Please try again later.");
    return null;
  }
};
