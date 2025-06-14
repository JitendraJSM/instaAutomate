// async function main() {
//   const db = require("./functionsLibrary/db.js");
//   const dueTaskObj = { parentModuleName: "instaAuto", actionName: "updateUserData", argumentsString: true };
//   await db.removeDueTask("kajalmahioffical143", dueTaskObj);
//   console.log("Due task removed successfully.");
// }
// main();
// ======== Testing readUserProfileData() function ========
// async function main() {
//   const db = require("./functionsLibrary/db.js");
//   const userName = "best.frnds.jsm";
//   const result = await db.readUserProfileData(userName);
//   console.log("Result is as Below:");
//   console.log(result);
// }
// main();

// ======== utils.removeDuplicates of writeProfilesData() Testing ========
// const db = require("./functionsLibrary/db.js");
// async function main() {
//   const profilesData = await db.readProfilesData();
//   const result = await db.writeProfilesData(profilesData);
//   console.log(`result.`);
// }

// main();

// ===== addDueTask() Testing ====
const db = require("./functionsLibrary/db.js");
async function main() {
  const result = await db.addDueTask("kajalmahioffical143", {
    parentModuleName: "instaAuto",
    actionName: "updateUserData",
    argumentsString: true,
  });
  console.log(`result.`);
  console.log(result);
}

main();
