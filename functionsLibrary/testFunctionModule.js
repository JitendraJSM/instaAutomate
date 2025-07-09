const db = require("./db.js");
const testFunction = async function () {
  console.log(`testFunction started.`);

  const duetask1toadd = {
    parentModuleName: "instaAuto",
    actionName: "follow",
    argumentsString: "sweet_sonu.001",
  };

  await db.addDueTask("best.frnds.jsm", duetask1toadd);
};

module.exports = {
  testFunction,
};
