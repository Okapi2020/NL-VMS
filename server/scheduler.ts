import { storage } from "./storage";

/**
 * Schedule function that runs at midnight to check out all active visitors
 */
export function setupMidnightCheckout() {
  // Helper function to calculate milliseconds until midnight
  const getMsUntilMidnight = (): number => {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // next day
      0, 0, 0 // midnight (00:00:00)
    );
    return midnight.getTime() - now.getTime();
  };
  
  // Function to run the auto-checkout
  const runAutoCheckout = async () => {
    try {
      console.log("Running scheduled midnight auto-checkout...");
      
      // Check out all active visits
      const checkedOutCount = await storage.checkOutAllActiveVisits();
      
      // Log result
      console.log(`Midnight auto-checkout completed: ${checkedOutCount} active visits were automatically checked out.`);
    } catch (error) {
      console.error("Error during scheduled auto-checkout:", error);
    } finally {
      // Schedule next auto-checkout for the next midnight
      const msUntilMidnight = getMsUntilMidnight();
      console.log(`Next auto-checkout scheduled in ${Math.floor(msUntilMidnight / 1000 / 60 / 60)} hours and ${Math.floor((msUntilMidnight / 1000 / 60) % 60)} minutes`);
      setTimeout(runAutoCheckout, msUntilMidnight);
    }
  };
  
  // Calculate time until midnight
  const msUntilMidnight = getMsUntilMidnight();
  
  // Convert milliseconds to more human-readable format
  const hoursUntilMidnight = Math.floor(msUntilMidnight / 1000 / 60 / 60);
  const minutesUntilMidnight = Math.floor((msUntilMidnight / 1000 / 60) % 60);
  
  console.log(`Auto-checkout scheduler initialized. First auto-checkout will run in ${hoursUntilMidnight} hours and ${minutesUntilMidnight} minutes at midnight.`);
  
  // Schedule the first run at midnight
  setTimeout(runAutoCheckout, msUntilMidnight);
  
  // Also provide a function to run the checkout manually (useful for testing)
  return {
    runManualCheckout: async () => {
      console.log("Running manual auto-checkout...");
      const checkedOutCount = await storage.checkOutAllActiveVisits();
      console.log(`Manual auto-checkout completed: ${checkedOutCount} active visits were checked out.`);
      return checkedOutCount;
    }
  };
}