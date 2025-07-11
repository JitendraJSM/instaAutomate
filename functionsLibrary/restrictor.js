const db = require("./db.js");

// TODO: Must add updateUserData() restriction so that any account can not get more than one update in a day

// Must Call with this as App
const checkForFollowDueTask = async function (taskHistory) {
  const maxAutoStartFollowings = 3;
  // Count follow actions by kajal_mahi001 using for loop
  let followActionCount = 0;
  for (let i = 0; i < taskHistory.length; i++) {
    const task = taskHistory[i];
    if (task.currentProfile === this.state.currentProfile.userName && task.actionName === "follow") {
      //Check
      followActionCount++;
      if (followActionCount >= maxAutoStartFollowings) {
        console.log(`${this.state.currentProfile.userName} has already followed ${followActionCount} so more Follow action could not be allowed to prevent flagged or ban.`);
        // return false;    // result of any function must be specific as the result in case of error will be undefined same as false.
        return "not Allowed";
      }
    }
  }

  console.log(`Number of follow actions done today by ${this.state.currentProfile.userName} is : ${followActionCount}`);
  return true;
};

// Needs to be called with "this"
const isDueTaskApprovedToPerform = async function (dueTaskObj = this.currentAction) {
  console.log(`isDueTaskApprovedToPerform is started....`);
  let result = false;
  //  1.  Read today's taskHistory
  const taskHistrory = await db.readTaskHistrory();
  console.log(`taskHistory: `);
  console.log(taskHistrory);
  result = await checkForFollowDueTask.call(this, taskHistrory);
  return result;
};
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  isDueTaskApprovedToPerform: catchAsync(isDueTaskApprovedToPerform),
};
