const hookMethodsOnPage = require("../functionsLibrary/pageHookFunctions.js");
// -- All The Functions related to Chrome Browser --

// === Implementation ===

// 1. Start / Open this.state.profileTarget / Connect to browser

const initializeBrowser = async function () {
  let { getBrowser } = require("../utils/getBrowser.js");

  try {
    console.log(`Initializing browser...`);

    this.state.browserOptions = {
      profileTarget: this.state.profileTarget,
    };

    // Initialize browser and page
    const result = await getBrowser(this.state.browserOptions);
    this.browser = result.browser;

    this.page = result.page;
    hookMethodsOnPage.call(this, this.page);

    // Extra code that is not neccessary but useful
    const context = this.browser.defaultBrowserContext();
    await context.overridePermissions("https://www.youtube.com/", []);

    return true;
  } catch (error) {
    console.error("Failed to initialize browser:", error);
    throw error;
  }
};

// 2. Delete this.browser and Reconnect to browser
const reconnectBrowser = async function () {
  let { getBrowser } = require("../utils/getBrowser.js");

  try {
    console.log(`Reconnecting browser...`);

    if (this.browser) delete this.browser;

    await initializeBrowser();

    return true;
  } catch (error) {
    console.error("Failed to initialize browser:", error);
    throw error;
  }
};

// 3. Close the browser
const closeBrowser = async function () {
  const userInput = await this.utlis.askUser("Are you sure you want to close the browser? (y/n): ");
  if (userInput.toLowerCase() !== "n") {
    console.log("Browser close operation cancelled.");
    return;
  }
  // If the browser was not disconnected, we try to reconnect
  if (!this.browser) await reconnectBrowser.call(this);
  await this.browser.close();
  this.browser = null;
  console.log("Browser closed successfully.");
};

// 4. To console log all pages URLs
const printAllPagesURLs = async function () {
  let pages = await this.browser.pages();

  // Replace each page object with its URL
  pages = await Promise.all(pages.map(async (page) => await page.url()));
  console.log(`pages : ${pages}`);
};

// === Interface ===
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  initializeBrowser: catchAsync(initializeBrowser),
  reconnectBrowser: catchAsync(reconnectBrowser),
  closeBrowser: catchAsync(closeBrowser),
  printAllPagesURLs: catchAsync(printAllPagesURLs),
};
