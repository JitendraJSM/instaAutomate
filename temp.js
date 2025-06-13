// async function main() {
//   const db = require("./functionsLibrary/db.js");
//   const dueTaskObj = { parentModuleName: "instaAuto", actionName: "updateUserData", argumentsString: true };
//   await db.removeDueTask("kajalmahioffical143", dueTaskObj);
//   console.log("Due task removed successfully.");
// }
// main();
// ======== Testing readUserProfileData() function ========
async function main() {
  const db = require("./functionsLibrary/db.js");
  const userProfile = {};
  const result = await db.readUserProfileData({
    userName: "kajalmahioffical143",
    // type: "agent",
  });
  console.log("Result is as Below:");
  console.log(result);
}
main();
