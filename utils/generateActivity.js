import Activity from "../models/Activity.js";

export const generateActivity = async ({ activityId, user, role, action }) => {
  const existing = await Activity.findOne({ activityId });
  if (existing) {
    return;
  }
  const activity = new Activity({
    activityId,
    user,
    role,
    action,
  });

  // Save the activity to the database
  await activity.save();
};
