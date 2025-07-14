const { getBrowser } = require("../utils/getBrowser.js");
const hookMethodsOnPage = require("../functionsLibrary/pageHookFunctions.js");
const { testFunction } = require("../functionsLibrary/testFunctionModule.js");

async function main() {
  console.log(`main started....`);

  const options = {};
  options.profileTarget = 21;
  options.initialURL = "https://example.com/";
  const { browser, page } = await getBrowser(options);
  this.browser = browser;
  this.page = page;
  await hookMethodsOnPage(page);
  await this.page.navigateTo.call(this, "https://example.com/");
  await this.page.listAllPages.call(this);

  this.state = {};
  await testFunction();
  console.log(`================Ended......====================`);
}
main();
