require("dotenv").config();

const App = require("./modules/AppModule.js");

// === Tasks ===
const initialTestTask = require("./tasks/initialTestTask3.json");
initialTestTask.taskName = "initialTestTask";

const initialTestTask_copy = require("./tasks/initialTestTask copy.json");
initialTestTask_copy.taskName = "initialTestTask_copy";

const instaAutomationTask = require("./tasks/instaAutomationTask.json");
instaAutomationTask.taskName = "instaAutomationTask";

async function main() {
  console.log(`Main function Started.`);

  let app = new App();

  // ------------------ Testing purpose ---------------------------
  // await app.run(initialTestTask);
  await app.run(instaAutomationTask);
  // await app.run(initialTestTask_copy);
}
main();
