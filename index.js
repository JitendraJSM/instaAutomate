require("dotenv").config();

const App = require("./modules/AppModule.js");

// === Tasks ===
const initialTestTask = require("./tasks/initialTestTask.json");
initialTestTask.taskName = "initialTestTask";

// === Testing Purpose ===
const instaAutoFunc = require("./example.js");

async function main() {
  console.log(`Main function Started.`);

  let app = new App();

  // ------------------ Testing purpose ---------------------------
  app.state;
  await app.run(initialTestTask);
  // console.log(`=================================`);
  // console.log(app);
  // console.log(`=================================`);

  console.log(`let's start running instaAutoFunc`);
  await instaAutoFunc(app);
  console.log(`InstaAutoFunc just finished running.`);
  // console.log(`app.state is as below : `);
  // console.log(app.state);

  // console.log(`app is as below : `);
  // console.log(app);

  // console.log(`New member to add is as below :`);
  // console.log(app.state.newMemberToAdd);
  // console.log(
  //   `Next available chrome profile is : ${app.state.nextAvailableChromeProfile}`
  // );
  // -----------------------------------------------------------
  // const pages = await app.browser.pages();
  // console.log(`${pages.length} pages opened.`);
  // // Print URLs of all open pages
  // console.log(`================================`);
  // for (const page of pages) {
  //   console.log(`Page URL: ${page.url()}`);
  // }
  // console.log(`================================`);
  // ------------------ Testing purpose ---------------------------

  // console.log(`---END---`);
}
main();
