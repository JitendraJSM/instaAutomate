async function main() {
  const db = require("./functionsLibrary/db.js");
  const dueTaskObj = { parentModuleName: "instaAuto", actionName: "updateUserData", argumentString: true };
  await db.removeDueTask("kajalmahioffical143", dueTaskObj);
  console.log("Due task removed successfully.");
}
main();
