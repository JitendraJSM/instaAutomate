// ====== Flow ======
/* 
1. Read profilesData.json file.
2. Loop over each and every profile that have type="agent".
  2.1   Read `${currentProfile.userName}.json` file and store data on this.state.myUserData.
  2.2   Perform myUserData.dueTasks
  2.3   Change IP Address-
          2.6.1   Get current IP Address.
          2.6.2   Request Webhook created by macrodroid to change toggle Airplane mode of mobile phone.
          2.6.3   Wait for 2 to 3 minutes.
          2.6.4   Get current IP Address again and compare with previous IP Address.
          2.6.5   If IP Address is changed then return from IPChange loop, else repeat from 2.6.1
  2.4   Get the next currentProfile and Repeat from 2.
*/
/* 
// ======= 2.2 Perform myUserData.dueTasks ======
  2.2   Open chrome `${currentProfile.profileTarget}`
  2.2   Perform updation of myUserData
          2.3.1   scrapeUserData()    <-- no arguments or `${myUserData.userName}`
          2.3.2   rewrite `${currentProfile.userName}.json`
          2.3.3   rewrite profilesData.json with profilesData[currentProfile.userName].lastUpdate = new Date().toISOString();
  2.3   Close the chrome browser.
*/
// ======= Imports =======
const assert = require("assert");
const fs = require("fs-extra");
const { join } = require("path");

const JSONDB = require("./db.js");

// ======= Constants =======
const botWorkShiftHours = 16;

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

// ======= DB Functions =======
const readProfilesData = async function () {
  return JSON.parse(await fs.readFile("./data/instaData/profilesData.json"));
};
const addNewProfile = async function () {
  const newProfile = {};
  newProfile.profileTarget = await this.utils.askUser("Enter profile target: ");
  if (
    this.state.profilesData.find(
      (profile) => profile.profileTarget == newProfile.profileTarget
    )
  )
    throw new Error(
      `Profile with target ${newProfile.profileTarget} already exists`
    );
  newProfile.userName = await this.utils.askUser(`Enter user name:`);
  if (
    this.state.profilesData.find(
      (profile) => profile.userName == newProfile.userName
    )
  )
    throw new Error(
      `Profile with user name: ${newProfile.userName} already exists`
    );
  newProfile.password = await this.utils.askUser(`Enter password:`);
  const userInput = await this.utils.askUser(
    "Enter type of profile: 1 for 'agent', 2 for 'scrper'"
  );
  if (userInput === "1") newProfile.type = "agent";
  else if (userInput === "2") newProfile.type = "scraper";
  else throw new Error(`Invalid input`);

  this.state.profilesData.push(newProfile);
  await fs.writeFile(
    "./data/instaData/profilesData.json",
    JSON.stringify(this.state.profilesData, null, 2)
  );
  return true;
};
const updateUserData = async function () {
  let userData;
  const userDataPath = `./data/instaData/${this.state.currentProfile.userName}-data.json`;
  let needUpadte = true;
  // Check if user data file exists
  if (await fs.pathExists(userDataPath)) {
    userData = JSON.parse(await fs.readFile(userDataPath));
    if (userData.lastUpdate) {
      // Check if last update was more than 24 hours ago (86400000 ms = 1 day)
      const timeDiff = new Date() - new Date(userData.lastUpdate);
      if (timeDiff < 86400000) needUpadte = false;
    }
  }
  if (needUpadte) {
    console.log(
      `UserData of ${this.state.currentProfile.userName} needs to be updated.`
    );

    const scrapedUserData = await scrapeUserData.call(
      this,
      this.state.currentProfile.userName
    );

    this.state.currentProfile.userName = scrapedUserData.userName;
    this.state.currentProfile.password = scrapedUserData.password;
    this.state.currentProfile.type = scrapedUserData.type;
    this.state.currentProfile.profileTarget = this.state.profileTarget;
    this.state.currentProfile.postsCount =
      scrapedUserData.edge_owner_to_timeline_media.count;
    this.state.currentProfile.followersCount =
      scrapedUserData.edge_followed_by.count;
    this.state.currentProfile.followingsCount =
      scrapedUserData.edge_follow.count;
    this.state.currentProfile.mutualFollowersCount =
      scrapedUserData.edge_mutual_followed_by.count;
    this.state.currentProfile = {
      ...this.state.currentProfile,
      ...scrapedUserData,
    }; // Fixed variable name from scrapeUserData to scrapedUserData
    this.state.currentProfile.lastUpdate = new Date().toISOString();
    await fs.writeFile(
      userDataPath,
      JSON.stringify(this.state.currentProfile, null, 2)
    );
  } else
    console.log(
      `UserData of ${this.state.currentProfile.userName} does not need an updated.`
    );
};

// ======= Main Functions =======

const instaAutomation = async function () {
  this.state.profilesData = await readProfilesData();

  const userInput = await this.utils.askUser(
    `Do you want to add new profile? (y/n): `
  );
  if (userInput.toLowerCase() === "y") {
    const addNewProfileResponse = await addNewProfile.call(this);
    if (!addNewProfileResponse) throw new Error(`Failed to add new profile`);
  }

  this.state.profilesToLoop = this.state.profilesData.filter(
    (profile) => profile.type === "agent"
  );
  // console.log(this.state.profilesToLoop);
  if (this.state.profilesToLoop.length === 0)
    throw new Error(`No profiles to loop`);

  this.state.currentProfileIndex = 0;
  while (this.state.currentProfileIndex < this.state.profilesToLoop.length) {
    this.state.currentProfile =
      this.state.profilesToLoop[this.state.currentProfileIndex];

    console.log(`currentProfile to loop over is as: `);
    console.log(this.state.currentProfile);
    // console.log(`Before this.tasks`);
    // console.log(this.task);

    await performDueTasks.call(this);
    // console.log(`After this.tasks`);
    // console.log(this.task);

    // const currentProfile = profilesToLoop[currenttProfileIndex];
    // this.state.currentProfile = currentProfile;
    // await this.instaAuto.updateUserData.call(this);
    // Close browser
    // await this.browser.close();

    // Change IP address
    // let ipChanged = false;
    // while (!ipChanged) {
    //   const currentIP = await this.utils.getCurrentIP();
    //   await this.utils.triggerAirplaneModeToggle();
    //   await sleep(180000); // Wait 3 minutes
    //   const newIP = await this.utils.getCurrentIP();
    //   ipChanged = currentIP !== newIP;
    // }

    this.state.currentProfileIndex++;
  }
  console.log(`---- All Tasks Added ----`);
};

const performDueTasks = async function () {
  // const lastTask = this.task.pop();
  // const agentPreDueTasks = [
  //   {
  //     expression: `this.state.profileTarget = ${this.state.currentProfile.profileTarget}*1`,
  //   },
  //   {
  //     parentModuleName: "chrome",
  //     actionName: "initializeBrowser",
  //   },
  //   {
  //     parentModuleName: "instaAuto",
  //     actionName: "updateUserData",
  //   },
  //   {
  //     parentModuleName: "instaAuto",
  //     actionName: "follow",
  //     argumentsString: `ritika_paswan._`,
  //     doNotParseArgumentString: true, // must be true if arugumentString contains dot or /
  //   },
  // ];
  // this.task = [...this.task, ...agentPreDueTasks, lastTask];
  // console.log(`let's returning from instaAutomation to main tasks-----`);
  // return;
  // agentPreDueTasks are as below
  // this.state.profileTarget = this.state.currentProfile.profileTarget;
  await this.chrome.initializeBrowser.call(this);
  await this.instaAuto.updateUserData.call(this);
  console.log(`instaAuto.updateUserData() completed.`);
  console.log(`Let's try follow function`);
  await follow.call(this, "ritika_paswan._");
  console.log(`follow function executed.`);
};

const goInstaHome = async function () {
  if (
    this.page.url() !==
    `https://www.instagram.com/${this.state.currentProfile.userName}`
  )
    await this.page.navigateTo(
      `https://www.instagram.com/${this.state.currentProfile.userName}`
    );
};

const scrapeUserData = async function (
  userName,
  needFollowers = true,
  needFollowings = true
) {
  // const userName = "diwanshi1619";
  // const userName = "best.frnds.jsm";
  /* It is not needed to navigate to user before scraping but it is better so not get banned.*/
  if (this.page.url() !== `https://www.instagram.com/${userName}`)
    await this.page.navigateTo(`https://www.instagram.com/${userName}`);

  let scrapedData;
  // --- Logic for scraping data is copied from "getUserDataFromInterceptedRequest" function of instaAuto git repo of mifi.
  const t = setTimeout(async () => {
    console.log("Unable to intercept request, will send manually");
    try {
      await this.page.evaluate(async (username2) => {
        const response = await window.fetch(
          `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
            username2.toLowerCase()
          )}`,
          {
            mode: "cors",
            credentials: "include",
            headers: { "x-ig-app-id": "936619743392459" },
          }
        );
        await response.json(); // else it will not finish the request
      }, userName);
      // todo `https://i.instagram.com/api/v1/users/${userId}/info/`
      // https://www.javafixing.com/2022/07/fixed-can-get-instagram-profile-picture.html?m=1
    } catch (err) {
      console.error("Failed to manually send request", err);
    }
  }, 5000);

  try {
    const [foundResponse] = await Promise.all([
      this.page.waitForResponse(
        (response) => {
          const request = response.request();
          return (
            request.method() === "GET" &&
            new RegExp(
              `https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/users\\/web_profile_info\\/\\?username=${encodeURIComponent(
                userName.toLowerCase()
              )}`
            ).test(request.url())
          );
        },
        { timeout: 30000 }
      ),
      // navigateToUserWithCheck(userName),
      // page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const json = JSON.parse(await foundResponse.text());
    console.log("the scraped data is as: ");
    scrapedData = json.data.user;
  } finally {
    clearTimeout(t);
  }
  console.log("the scraped data is as: ");
  console.log(`User name is: ${scrapedData.username}`);
  console.log(`User's id is: ${scrapedData.id}`);
  console.log(
    `Number of Posts are: ${scrapedData.edge_owner_to_timeline_media.count}`
  );
  console.log(`followers are: ${scrapedData.edge_followed_by.count}`);
  console.log(`followings are: ${scrapedData.edge_follow.count}`);
  console.log(
    `mutual followers are: ${scrapedData.edge_mutual_followed_by.count}`
  );
  console.log(
    `1st mutual follower: ${scrapedData.edge_mutual_followed_by.edges[0]}`
  );

  // Logic to get followers and followings also

  if (needFollowers || needFollowings) {
    const { followers, followings } = await getListOfFollowersOrFollowings.call(
      this,
      scrapedData.id,
      needFollowers,
      needFollowings
    );
    scrapedData.followers = followers;
    scrapedData.followings = followings;
  }

  return scrapedData;
};

const getListOfFollowersOrFollowings = async function (
  targetUserId,
  needFollowers,
  needFollowings
) {
  console.log(`Starting to get list of followers or followings...`);

  let page = this.page;
  const instagramBaseUrl = "https://www.instagram.com";

  async function getPageJson() {
    return JSON.parse(
      await (await (await page.$("pre")).getProperty("textContent")).jsonValue()
    );
  }
  async function* graphqlQueryUsers({
    queryHash,
    getResponseProp,
    graphqlVariables: graphqlVariablesIn,
  }) {
    const graphqlUrl = `${instagramBaseUrl}/graphql/query/?query_hash=${queryHash}`;

    const graphqlVariables = {
      first: 50,
      ...graphqlVariablesIn,
    };

    const outUsers = [];

    let hasNextPage = true;
    let i = 0;

    while (hasNextPage) {
      const url = `${graphqlUrl}&variables=${JSON.stringify(graphqlVariables)}`;
      // logger.log(url);
      await page.navigateTo(url);
      // await page.goto(url);
      const json = await getPageJson();

      const subProp = getResponseProp(json);
      const pageInfo = subProp.page_info;
      const { edges } = subProp;

      const ret = [];
      edges.forEach((e) => ret.push(e.node.username));

      graphqlVariables.after = pageInfo.end_cursor;
      hasNextPage = pageInfo.has_next_page;
      i += 1;

      if (hasNextPage) {
        logger.log(`Has more pages (current ${i})`);
        // await sleep(300);
      }

      yield ret;
    }

    return outUsers;
  }
  function getFollowersOrFollowingGenerator({ userId, getFollowers = false }) {
    return graphqlQueryUsers({
      getResponseProp: (json) =>
        json.data.user[getFollowers ? "edge_followed_by" : "edge_follow"],
      graphqlVariables: { id: userId },
      queryHash: getFollowers
        ? "37479f2b8209594dde7facb0d904896a"
        : "58712303d941c6855d4e888c5f0cd22f",
    });
  }
  async function getFollowersOrFollowing({ userId, getFollowers = false }) {
    let users = [];
    for await (const usersBatch of getFollowersOrFollowingGenerator({
      userId,
      getFollowers,
    })) {
      users = [...users, ...usersBatch];
    }

    return users;
  }

  // Getting all followers
  let followers, followings;
  if (needFollowers) {
    followers = await getFollowersOrFollowing({
      userId: targetUserId,
      getFollowers: true,
    });
    // console.log(`Followers are as:`);
    console.log(followers);
  }
  await goInstaHome.call(this);
  if (needFollowings) {
    followings = await getFollowersOrFollowing({
      userId: targetUserId,
      getFollowers: false,
    });
    // console.log(`followings are as:`);
    console.log(followings);
  }
  await goInstaHome.call(this);
  return { followers, followings };
};

const scrapeContentOfUser = async function () {};

const follow = async function (userName) {
  await goInstaHome.call(this);
  await this.page.clickNotClickable('[aria-label="Search"]');
  await this.page.clickNotClickable('input[aria-label="Search input"]');
  await this.page.typeHuman('input[aria-label="Search input"]', userName);
  // diwanshi1619
  await this.utils.randomDelay(5, 2);
  // const userNameSelector = `'[href="/${userName}/"]'`;
  // console.log(`the selector is as: ${userNameSelector}`);

  await this.page.clickNotClickable(`span ::-p-text(${userName})`);
  await this.utils.randomDelay(3, 1);
  await this.page.clickNotClickable(`::-p-text(Follow)`);
};

// =========================================================

const instaAutomate = async function () {
  if (this.page.url() !== "https://www.instagram.com/")
    await this.page.navigateTo("https://www.instagram.com/");
};
const Instauto = async function (db, browser, options) {
  // ======= Destructuring Constantc Options from Options Object =======
  const {
    instagramBaseUrl = "https://www.instagram.com",
    // cookiesPath,        //-------

    username: myUsernameIn,
    password,
    // enableCookies = true,    //-------

    // randomizeUserAgent = true,    //-------
    // userAgent,     //-------

    maxFollowsPerHour = 20,
    maxFollowsPerDay = 150,

    maxLikesPerDay = 50,

    followUserRatioMin = 0.2,
    followUserRatioMax = 4.0,
    followUserMaxFollowers = null,
    followUserMaxFollowing = null,
    followUserMinFollowers = null,
    followUserMinFollowing = null,

    shouldFollowUser = null,
    shouldLikeMedia = null,

    dontUnfollowUntilTimeElapsed = 3 * 24 * 60 * 60 * 1000,

    excludeUsers = [],

    dryRun = true,

    // screenshotOnError = false,        //-------
    // screenshotsPath = ".",       //-------
    screenshotOnError = true,
    screenshotsPath = "../data/screenshots",

    logger = console,
  } = options;

  let myUsername = myUsernameIn;
  const userDataCache = {};

  const {
    addPrevFollowedUser,
    getPrevFollowedUser,
    addPrevUnfollowedUser,
    getLikedPhotosLastTimeUnit,
    getPrevUnfollowedUsers,
    getPrevFollowedUsers,
    addLikedPhoto,
  } = db;

  let page;
  // ======= assert is for Validation =======
  assert(db);
  assert(
    maxFollowsPerHour * botWorkShiftHours >= maxFollowsPerDay,
    "Max follows per hour too low compared to max follows per day"
  );

  // ======= Functions =======
  const getNumLikesThisTimeUnit = (time) =>
    getLikedPhotosLastTimeUnit(time).length;

  async function takeScreenshot() {
    if (!screenshotOnError) return;
    try {
      const fileName = `${new Date().getTime()}.jpg`;
      logger.log("Taking screenshot", fileName);
      await page.screenshot({
        path: join(screenshotsPath, fileName),
        type: "jpeg",
        quality: 30,
      });
    } catch (err) {
      logger.error("Failed to take screenshot", err);
    }
  }
  const sleepFixed = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const sleep = (ms, deviation = 1) => {
    let msWithDev = (Math.random() * deviation + 1) * ms;
    if (dryRun) msWithDev = Math.min(3000, msWithDev); // for dryRun, no need to wait so long
    logger.log("Waiting", (msWithDev / 1000).toFixed(2), "sec");
    return sleepFixed(msWithDev);
  };

  async function onImageLiked({ username, href }) {
    await addLikedPhoto({ username, href, time: new Date().getTime() });
  }

  function getNumFollowedUsersThisTimeUnit(timeUnit) {
    const now = new Date().getTime();

    return (
      getPrevFollowedUsers().filter((u) => now - u.time < timeUnit).length +
      getPrevUnfollowedUsers().filter(
        (u) => !u.noActionTaken && now - u.time < timeUnit
      ).length
    );
  }

  async function checkReachedFollowedUserDayLimit() {
    if (getNumFollowedUsersThisTimeUnit(dayMs) >= maxFollowsPerDay) {
      logger.log("Have reached daily follow/unfollow limit, waiting 10 min");
      await sleep(10 * 60 * 1000);
    }
  }

  async function checkReachedFollowedUserHourLimit() {
    if (getNumFollowedUsersThisTimeUnit(hourMs) >= maxFollowsPerHour) {
      logger.log("Have reached hourly follow rate limit, pausing 10 min");
      await sleep(10 * 60 * 1000);
    }
  }

  async function checkReachedLikedUserDayLimit() {
    if (getNumLikesThisTimeUnit(dayMs) >= maxLikesPerDay) {
      logger.log("Have reached daily like rate limit, pausing 10 min");
      await sleep(10 * 60 * 1000);
    }
  }

  async function throttle() {
    await checkReachedFollowedUserDayLimit();
    await checkReachedFollowedUserHourLimit();
    await checkReachedLikedUserDayLimit();
  }

  function haveRecentlyFollowedUser(username) {
    const followedUserEntry = getPrevFollowedUser(username);
    if (!followedUserEntry) return false; // We did not previously follow this user, so don't know
    return (
      new Date().getTime() - followedUserEntry.time <
      dontUnfollowUntilTimeElapsed
    );
  }
  // See https://github.com/mifi/SimpleInstaBot/issues/140#issuecomment-1149105387
  const gotoUrl = async (url) =>
    page.goto(url, { waitUntil: ["load", "domcontentloaded", "networkidle0"] });

  async function gotoWithRetry(url) {
    const maxAttempts = 3;
    for (let attempt = 0; ; attempt += 1) {
      logger.log(`Goto ${url}`);
      const response = await gotoUrl(url);
      const status = response.status();
      logger.log("Page loaded");
      await sleep(2000);

      // https://www.reddit.com/r/Instagram/comments/kwrt0s/error_560/
      // https://github.com/mifi/instauto/issues/60
      if (![560, 429].includes(status)) return status;

      if (attempt > maxAttempts) {
        throw new Error(
          `Navigate to user failed after ${maxAttempts} attempts, last status: ${status}`
        );
      }

      logger.info(`Got ${status} - Retrying request later...`);
      if (status === 429)
        logger.warn(
          "429 Too Many Requests could mean that Instagram suspects you're using a bot. You could try to use the Instagram Mobile app from the same IP for a few days first"
        );
      await sleep((attempt + 1) * 30 * 60 * 1000);
    }
  }

  const getUserPageUrl = (username) =>
    `${instagramBaseUrl}/${encodeURIComponent(username)}`;

  function isAlreadyOnUserPage(username) {
    const url = getUserPageUrl(username);
    // optimization: already on URL? (ignore trailing slash)
    return page.url().replace(/\/$/, "") === url.replace(/\/$/, "");
  }

  async function navigateToUser(username) {
    if (isAlreadyOnUserPage(username)) return true;

    // logger.log('navigating from', page.url(), 'to', url);
    logger.log(`Navigating to user ${username}`);

    const url = getUserPageUrl(username);
    const status = await gotoWithRetry(url);
    if (status === 404) {
      logger.warn("User page returned 404");
      return false;
    }

    if (status === 200) {
      // logger.log('Page returned 200 ☑️');
      // some pages return 200 but nothing there (I think deleted accounts)
      // https://github.com/mifi/SimpleInstaBot/issues/48
      // example: https://www.instagram.com/victorialarson__/
      // so we check if the page has the user's name on it
      const elementHandles = await page.$x(
        `//body//main//*[contains(text(),${escapeXpathStr(username)})]`
      );
      const foundUsernameOnPage = elementHandles.length > 0;
      if (!foundUsernameOnPage)
        logger.warn(`Cannot find text "${username}" on page`);
      return foundUsernameOnPage;
    }

    throw new Error(`Navigate to user failed with status ${status}`);
  }

  async function navigateToUserWithCheck(username) {
    if (!(await navigateToUser(username))) throw new Error("User not found");
  }

  async function navigateToUserAndGetData(username) {
    const cachedUserData = userDataCache[username];

    if (isAlreadyOnUserPage(username)) {
      // assume we have data
      return cachedUserData;
    }

    if (cachedUserData != null) {
      // if we already have userData, just navigate
      await navigateToUserWithCheck(username);
      return cachedUserData;
    }

    async function getUserDataFromPage() {
      // https://github.com/mifi/instauto/issues/115#issuecomment-1199335650
      // to test in browser: document.getElementsByTagName('html')[0].innerHTML.split('\n');
      try {
        const body = await page.content();
        for (let q of body.split(/\r?\n/)) {
          if (q.includes("edge_followed_by")) {
            // eslint-disable-next-line prefer-destructuring
            q = q.split(",[],[")[1];
            // eslint-disable-next-line prefer-destructuring
            q = q.split("]]]")[0];
            q = JSON.parse(q);
            // eslint-disable-next-line no-underscore-dangle
            q = q.data.__bbox.result.response;
            q = q.replace(/\\/g, "");
            q = JSON.parse(q);
            return q.data.user;
          }
        }
      } catch (err) {
        logger.warn(
          `Unable to get user data from page (${err.name}) - This is normal`
        );
      }
      return undefined;
    }

    // intercept special XHR network request that fetches user's data and store it in a cache
    // TODO fallback to DOM to get user ID if this request fails?
    // https://github.com/mifi/SimpleInstaBot/issues/125#issuecomment-1145354294
    async function getUserDataFromInterceptedRequest() {
      const t = setTimeout(async () => {
        logger.log("Unable to intercept request, will send manually");
        try {
          await page.evaluate(async (username2) => {
            const response = await window.fetch(
              `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
                username2.toLowerCase()
              )}`,
              {
                mode: "cors",
                credentials: "include",
                headers: { "x-ig-app-id": "936619743392459" },
              }
            );
            await response.json(); // else it will not finish the request
          }, username);
          // todo `https://i.instagram.com/api/v1/users/${userId}/info/`
          // https://www.javafixing.com/2022/07/fixed-can-get-instagram-profile-picture.html?m=1
        } catch (err) {
          logger.error("Failed to manually send request", err);
        }
      }, 5000);

      try {
        const [foundResponse] = await Promise.all([
          page.waitForResponse(
            (response) => {
              const request = response.request();
              return (
                request.method() === "GET" &&
                new RegExp(
                  `https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/users\\/web_profile_info\\/\\?username=${encodeURIComponent(
                    username.toLowerCase()
                  )}`
                ).test(request.url())
              );
            },
            { timeout: 30000 }
          ),
          navigateToUserWithCheck(username),
          // page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);

        const json = JSON.parse(await foundResponse.text());
        return json.data.user;
      } finally {
        clearTimeout(t);
      }
    }

    logger.log("Trying to get user data from HTML");

    await navigateToUserWithCheck(username);
    let userData = await getUserDataFromPage();
    if (userData) {
      userDataCache[username] = userData;
      return userData;
    }

    logger.log("Need to intercept network request to get user data");

    // works for old accounts only:
    userData = await getUserDataFromInterceptedRequest();
    if (userData) {
      userDataCache[username] = userData;
      return userData;
    }

    return undefined;
  }

  async function getPageJson() {
    return JSON.parse(
      await (await (await page.$("pre")).getProperty("textContent")).jsonValue()
    );
  }

  async function isActionBlocked() {
    if (
      (await page.$$('xpath///*[contains(text(), "Action Blocked")]')).length >
      0
    )
      return true;
    if (
      (await page.$$('xpath///*[contains(text(), "Try Again Later")]')).length >
      0
    )
      return true;
    return false;
  }

  async function checkActionBlocked() {
    if (await isActionBlocked()) {
      const hours = 3;
      logger.error(`Action Blocked, waiting ${hours} hours...`);
      // await tryDeleteCookies();      //------
      await sleep(hours * 60 * 60 * 1000);
      throw new Error("Aborted operation due to action blocked");
    }
  }
  // How to test xpaths in the browser:
  // document.evaluate("your xpath", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue
  async function findButtonWithText(text) {
    // todo escape text?

    // button seems to look like this now:
    // <button class="..."><div class="...">Follow</div></button>
    // https://sqa.stackexchange.com/questions/36918/xpath-text-buy-now-is-working-but-not-containstext-buy-now
    // https://github.com/mifi/SimpleInstaBot/issues/106
    let elementHandles = await page.$x(
      `//header//button[contains(.,'${text}')]`
    );
    if (elementHandles.length > 0) return elementHandles[0];

    // old button:
    elementHandles = await page.$x(`//header//button[text()='${text}']`);
    if (elementHandles.length > 0) return elementHandles[0];

    return undefined;
  }

  async function findFollowButton() {
    let button = await findButtonWithText("Follow");
    if (button) return button;

    button = await findButtonWithText("Follow Back");
    if (button) return button;

    return undefined;
  }

  async function findUnfollowButton() {
    let button = await findButtonWithText("Following");
    if (button) return button;

    button = await findButtonWithText("Requested");
    if (button) return button;

    let elementHandles = await page.$x(
      "//header//button[*//span[@aria-label='Following']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

    elementHandles = await page.$x(
      "//header//button[*//span[@aria-label='Requested']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

    elementHandles = await page.$x(
      "//header//button[*//*[name()='svg'][@aria-label='Following']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

    elementHandles = await page.$x(
      "//header//button[*//*[name()='svg'][@aria-label='Requested']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

    return undefined;
  }

  async function findUnfollowConfirmButton() {
    let elementHandles = await page.$x("//button[text()='Unfollow']");
    if (elementHandles.length > 0) return elementHandles[0];

    // https://github.com/mifi/SimpleInstaBot/issues/191
    elementHandles = await page.$x(
      "//*[@role='button'][contains(.,'Unfollow')]"
    );
    return elementHandles[0];
  }

  async function followUser(username) {
    await navigateToUserAndGetData(username);
    const elementHandle = await findFollowButton();

    if (!elementHandle) {
      if (await findUnfollowButton()) {
        logger.log("We are already following this user");
        await sleep(5000);
        return;
      }

      throw new Error("Follow button not found");
    }

    logger.log(`Following user ${username}`);

    if (!dryRun) {
      await elementHandle.click();
      await sleep(5000);

      await checkActionBlocked();

      const elementHandle2 = await findUnfollowButton();

      // Don't want to retry this user over and over in case there is an issue https://github.com/mifi/instauto/issues/33#issuecomment-723217177
      const entry = { username, time: new Date().getTime() };
      if (!elementHandle2) entry.failed = true;

      await addPrevFollowedUser(entry);

      if (!elementHandle2) {
        logger.log("Button did not change state - Sleeping 1 min");
        await sleep(60000);
        throw new Error("Button did not change state");
      }
    }

    await sleep(1000);
  }

  // See https://github.com/timgrossmann/InstaPy/pull/2345
  // https://github.com/timgrossmann/InstaPy/issues/2355
  async function unfollowUser(username) {
    await navigateToUserAndGetData(username);
    logger.log(`Unfollowing user ${username}`);

    const res = { username, time: new Date().getTime() };

    const elementHandle = await findUnfollowButton();
    if (!elementHandle) {
      const elementHandle2 = await findFollowButton();
      if (elementHandle2) {
        logger.log("User has been unfollowed already");
        res.noActionTaken = true;
      } else {
        logger.log("Failed to find unfollow button");
        res.noActionTaken = true;
      }
    }

    if (!dryRun) {
      if (elementHandle) {
        await elementHandle.click();
        await sleep(1000);
        const confirmHandle = await findUnfollowConfirmButton();
        if (confirmHandle) await confirmHandle.click();

        await sleep(5000);

        await checkActionBlocked();

        const elementHandle2 = await findFollowButton();
        if (!elementHandle2)
          throw new Error("Unfollow button did not change state");
      }

      await addPrevUnfollowedUser(res);
    }

    await sleep(1000);

    return res;
  }

  const isLoggedIn = async () =>
    (await page.$$('xpath///*[@aria-label="Home"]')).length === 1;

  // Checked until this by Jitendra Nath Swami.

  async function* graphqlQueryUsers({
    queryHash,
    getResponseProp,
    graphqlVariables: graphqlVariablesIn,
  }) {
    const graphqlUrl = `${instagramBaseUrl}/graphql/query/?query_hash=${queryHash}`;

    const graphqlVariables = {
      first: 50,
      ...graphqlVariablesIn,
    };

    const outUsers = [];

    let hasNextPage = true;
    let i = 0;

    while (hasNextPage) {
      const url = `${graphqlUrl}&variables=${JSON.stringify(graphqlVariables)}`;
      // logger.log(url);
      await page.goto(url);
      const json = await getPageJson();

      const subProp = getResponseProp(json);
      const pageInfo = subProp.page_info;
      const { edges } = subProp;

      const ret = [];
      edges.forEach((e) => ret.push(e.node.username));

      graphqlVariables.after = pageInfo.end_cursor;
      hasNextPage = pageInfo.has_next_page;
      i += 1;

      if (hasNextPage) {
        logger.log(`Has more pages (current ${i})`);
        // await sleep(300);
      }

      yield ret;
    }

    return outUsers;
  }

  function getFollowersOrFollowingGenerator({ userId, getFollowers = false }) {
    return graphqlQueryUsers({
      getResponseProp: (json) =>
        json.data.user[getFollowers ? "edge_followed_by" : "edge_follow"],
      graphqlVariables: { id: userId },
      queryHash: getFollowers
        ? "37479f2b8209594dde7facb0d904896a"
        : "58712303d941c6855d4e888c5f0cd22f",
    });
  }

  async function getFollowersOrFollowing({ userId, getFollowers = false }) {
    let users = [];
    for await (const usersBatch of getFollowersOrFollowingGenerator({
      userId,
      getFollowers,
    })) {
      users = [...users, ...usersBatch];
    }
    return users;
  }

  function getUsersWhoLikedContent({ contentId }) {
    return graphqlQueryUsers({
      getResponseProp: (json) => json.data.shortcode_media.edge_liked_by,
      graphqlVariables: {
        shortcode: contentId,
        include_reel: true,
      },
      queryHash: "d5d763b1e2acf209d62d22d184488e57",
    });
  }

  /* eslint-disable no-undef */
  async function likeCurrentUserImagesPageCode({
    dryRun: dryRunIn,
    likeImagesMin,
    likeImagesMax,
    shouldLikeMedia: shouldLikeMediaIn,
  }) {
    const allImages = Array.from(document.getElementsByTagName("a")).filter(
      (el) => /instagram.com\/p\//.test(el.href)
    );

    // eslint-disable-next-line no-shadow
    function shuffleArray(arrayIn) {
      const array = [...arrayIn];
      for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // eslint-disable-line no-param-reassign
      }
      return array;
    }

    const imagesShuffled = shuffleArray(allImages);

    const numImagesToLike = Math.floor(
      Math.random() * (likeImagesMax + 1 - likeImagesMin) + likeImagesMin
    );

    instautoLog(`Liking ${numImagesToLike} image(s)`);

    const images = imagesShuffled.slice(0, numImagesToLike);

    if (images.length < 1) {
      instautoLog("No images to like");
      return;
    }

    for (const image of images) {
      image.click();

      await window.instautoSleep(3000);

      const dialog = document.querySelector("*[role=dialog]");

      if (!dialog) throw new Error("Dialog not found");

      const section = Array.from(dialog.querySelectorAll("section")).find(
        (s) =>
          s.querySelectorAll('*[aria-label="Like"]')[0] &&
          s.querySelectorAll('*[aria-label="Comment"]')[0]
      );

      if (!section) throw new Error("Like button section not found");

      const likeButtonChild = section.querySelectorAll(
        '*[aria-label="Like"]'
      )[0];

      if (!likeButtonChild)
        throw new Error("Like button not found (aria-label)");

      // eslint-disable-next-line no-inner-declarations
      function findClickableParent(el) {
        let elAt = el;
        while (elAt) {
          if (elAt.click) {
            return elAt;
          }
          elAt = elAt.parentElement;
        }
        return undefined;
      }

      const foundClickable = findClickableParent(likeButtonChild);

      if (!foundClickable) throw new Error("Like button not found");

      const instautoLog2 = instautoLog;

      // eslint-disable-next-line no-inner-declarations
      function likeImage() {
        if (
          shouldLikeMediaIn !== null &&
          typeof shouldLikeMediaIn === "function"
        ) {
          const presentation = dialog.querySelector(
            "article[role=presentation]"
          );
          const img = presentation.querySelector('img[alt^="Photo by "]');
          const video = presentation.querySelector('video[type="video/mp4"]');
          const mediaDesc = presentation.querySelector(
            "[role=menuitem] h2 ~ div"
          ).textContent;
          let mediaType;
          let src;
          let alt;
          let poster;
          if (img) {
            mediaType = "image";
            ({ src } = img);
            ({ alt } = img);
          } else if (video) {
            mediaType = "video";
            ({ poster } = video);
            ({ src } = video);
          } else {
            instautoLog2("Could not determin mediaType");
          }

          if (!shouldLikeMediaIn({ mediaType, mediaDesc, src, alt, poster })) {
            instautoLog2(
              `shouldLikeMedia returned false for ${image.href}, skipping`
            );
            return;
          }
        }

        foundClickable.click();
        window.instautoOnImageLiked(image.href);
      }

      if (!dryRunIn) {
        likeImage();
      }

      await window.instautoSleep(3000);

      const closeButtonChild = document.querySelector(
        'svg[aria-label="Close"]'
      );

      if (!closeButtonChild)
        throw new Error("Close button not found (aria-label)");

      const closeButton = findClickableParent(closeButtonChild);

      if (!closeButton) throw new Error("Close button not found");

      closeButton.click();

      await window.instautoSleep(5000);
    }

    instautoLog("Done liking images");
  }
  /* eslint-enable no-undef */

  async function likeUserImages({
    username,
    likeImagesMin,
    likeImagesMax,
  } = {}) {
    if (
      !likeImagesMin ||
      !likeImagesMax ||
      likeImagesMax < likeImagesMin ||
      likeImagesMin < 1
    )
      throw new Error("Invalid arguments");

    await navigateToUserAndGetData(username);

    logger.log(`Liking ${likeImagesMin}-${likeImagesMax} user images`);
    try {
      await page.exposeFunction("instautoSleep", sleep);
      await page.exposeFunction("instautoLog", (...args) =>
        console.log(...args)
      );
      await page.exposeFunction("instautoOnImageLiked", (href) =>
        onImageLiked({ username, href })
      );
    } catch (err) {
      // Ignore already exists error
    }

    await page.evaluate(likeCurrentUserImagesPageCode, {
      dryRun,
      likeImagesMin,
      likeImagesMax,
      shouldLikeMedia,
    });
  }

  async function followUserRespectingRestrictions({
    username,
    skipPrivate = false,
  }) {
    if (getPrevFollowedUser(username)) {
      logger.log("Skipping already followed user", username);
      return false;
    }

    const graphqlUser = await navigateToUserAndGetData(username);

    const {
      edge_followed_by: { count: followedByCount },
      edge_follow: { count: followsCount },
      is_private: isPrivate,
      is_verified: isVerified,
      is_business_account: isBusinessAccount,
      is_professional_account: isProfessionalAccount,
      full_name: fullName,
      biography,
      profile_pic_url_hd: profilePicUrlHd,
      external_url: externalUrl,
      business_category_name: businessCategoryName,
      category_name: categoryName,
    } = graphqlUser;

    // logger.log('followedByCount:', followedByCount, 'followsCount:', followsCount);

    const ratio = followedByCount / (followsCount || 1);

    if (isPrivate && skipPrivate) {
      logger.log("User is private, skipping");
      return false;
    }
    if (
      (followUserMaxFollowers != null &&
        followedByCount > followUserMaxFollowers) ||
      (followUserMaxFollowing != null &&
        followsCount > followUserMaxFollowing) ||
      (followUserMinFollowers != null &&
        followedByCount < followUserMinFollowers) ||
      (followUserMinFollowing != null && followsCount < followUserMinFollowing)
    ) {
      logger.log(
        "User has too many or too few followers or following, skipping.",
        "followedByCount:",
        followedByCount,
        "followsCount:",
        followsCount
      );
      return false;
    }
    if (
      (followUserRatioMax != null && ratio > followUserRatioMax) ||
      (followUserRatioMin != null && ratio < followUserRatioMin)
    ) {
      logger.log(
        "User has too many followers compared to follows or opposite, skipping"
      );
      return false;
    }
    if (
      shouldFollowUser !== null &&
      typeof shouldFollowUser === "function" &&
      !shouldFollowUser({
        username,
        isVerified,
        isBusinessAccount,
        isProfessionalAccount,
        fullName,
        biography,
        profilePicUrlHd,
        externalUrl,
        businessCategoryName,
        categoryName,
      }) === true
    ) {
      logger.log(
        `Custom follow logic returned false for ${username}, skipping`
      );
      return false;
    }

    await followUser(username);

    await sleep(30000);
    await throttle();

    return true;
  }

  async function processUserFollowers(
    username,
    {
      maxFollowsPerUser = 5,
      skipPrivate = false,
      enableLikeImages,
      likeImagesMin,
      likeImagesMax,
    } = {}
  ) {
    const enableFollow = maxFollowsPerUser > 0;

    if (enableFollow)
      logger.log(
        `Following up to ${maxFollowsPerUser} followers of ${username}`
      );
    if (enableLikeImages)
      logger.log(
        `Liking images of up to ${likeImagesMax} followers of ${username}`
      );

    await throttle();

    let numFollowedForThisUser = 0;

    const { id: userId } = await navigateToUserAndGetData(username);

    for await (const followersBatch of getFollowersOrFollowingGenerator({
      userId,
      getFollowers: true,
    })) {
      logger.log("User followers batch", followersBatch);

      for (const follower of followersBatch) {
        await throttle();

        try {
          if (enableFollow && numFollowedForThisUser >= maxFollowsPerUser) {
            logger.log("Have reached followed limit for this user, stopping");
            return;
          }

          let didActuallyFollow = false;
          if (enableFollow)
            didActuallyFollow = await followUserRespectingRestrictions({
              username: follower,
              skipPrivate,
            });
          if (didActuallyFollow) numFollowedForThisUser += 1;

          const didFailToFollow = enableFollow && !didActuallyFollow;

          if (enableLikeImages && !didFailToFollow) {
            // Note: throws error if user isPrivate
            await likeUserImages({
              username: follower,
              likeImagesMin,
              likeImagesMax,
            });
          }
        } catch (err) {
          logger.error(`Failed to process follower ${follower}`, err);
          await takeScreenshot();
          await sleep(20000);
        }
      }
    }
  }

  async function processUsersFollowers({
    usersToFollowFollowersOf,
    maxFollowsTotal = 150,
    skipPrivate,
    enableFollow = true,
    enableLikeImages = false,
    likeImagesMin = 1,
    likeImagesMax = 2,
  }) {
    // If maxFollowsTotal turns out to be lower than the user list size, slice off the user list
    const usersToFollowFollowersOfSliced = shuffleArray(
      usersToFollowFollowersOf
    ).slice(0, maxFollowsTotal);

    const maxFollowsPerUser =
      enableFollow && usersToFollowFollowersOfSliced.length > 0
        ? Math.floor(maxFollowsTotal / usersToFollowFollowersOfSliced.length)
        : 0;

    if (
      maxFollowsPerUser === 0 &&
      (!enableLikeImages || likeImagesMin < 1 || likeImagesMax < 1)
    ) {
      logger.warn("Nothing to follow or like");
      return;
    }

    for (const username of usersToFollowFollowersOfSliced) {
      try {
        await processUserFollowers(username, {
          maxFollowsPerUser,
          skipPrivate,
          enableLikeImages,
          likeImagesMin,
          likeImagesMax,
        });

        await sleep(10 * 60 * 1000);
        await throttle();
      } catch (err) {
        logger.error(
          "Failed to process user followers, continuing",
          username,
          err
        );
        await takeScreenshot();
        await sleep(60 * 1000);
      }
    }
  }

  async function safelyUnfollowUserList(
    usersToUnfollow,
    limit,
    condition = () => true
  ) {
    logger.log("Unfollowing users, up to limit", limit);

    let i = 0; // Number of people processed
    let j = 0; // Number of people actually unfollowed (button pressed)

    for await (const listOrUsername of usersToUnfollow) {
      // backward compatible:
      const list = Array.isArray(listOrUsername)
        ? listOrUsername
        : [listOrUsername];

      for (const username of list) {
        if (await condition(username)) {
          try {
            const userFound = await navigateToUser(username);

            if (!userFound) {
              // to avoid repeatedly unfollowing failed users, flag them as already unfollowed
              logger.log("User not found for unfollow");
              await addPrevUnfollowedUser({
                username,
                time: new Date().getTime(),
                noActionTaken: true,
              });
              await sleep(3000);
            } else {
              const { noActionTaken } = await unfollowUser(username);

              if (noActionTaken) {
                await sleep(3000);
              } else {
                await sleep(15000);
                j += 1;

                if (j % 10 === 0) {
                  logger.log(
                    "Have unfollowed 10 users since last break. Taking a break"
                  );
                  await sleep(10 * 60 * 1000, 0.1);
                }
              }
            }

            i += 1;
            logger.log(`Have now unfollowed (or tried to unfollow) ${i} users`);

            if (limit && j >= limit) {
              logger.log(`Have unfollowed limit of ${limit}, stopping`);
              return j;
            }

            await throttle();
          } catch (err) {
            logger.error("Failed to unfollow, continuing with next", err);
          }
        }
      }
    }

    logger.log("Done with unfollowing", i, j);

    return j;
  }

  async function safelyFollowUserList({ users, skipPrivate, limit }) {
    logger.log("Following users, up to limit", limit);

    for (const username of users) {
      await throttle();

      try {
        await followUserRespectingRestrictions({ username, skipPrivate });
      } catch (err) {
        logger.error(`Failed to follow user ${username}, continuing`, err);
        await takeScreenshot();
        await sleep(20000);
      }
    }
  }

  function getPage() {
    return page;
  }
};

// ======= Exports =======
Instauto.JSONDB = JSONDB;

// module.exports = Instauto;
// === Interface ===
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  readProfilesData: catchAsync(readProfilesData),
  instaAutomate: catchAsync(instaAutomate),
  instaAutomation: catchAsync(instaAutomation),
  updateUserData: catchAsync(updateUserData),
  follow: catchAsync(follow),
  scrapeUserData: catchAsync(scrapeUserData),
  getListOfFollowersOrFollowings: catchAsync(getListOfFollowersOrFollowings),
  // clickShortsBTN: catchAsync(clickShortsBTN),
  // clickLikeBTN: catchAsync(clickLikeBTN),
};

// steps of execution
// 1. Definig Custom Logger as it is used from starting to ending   (related to instaAuto only )
// 2. Defining the options like defining the task options about likes, follows, unfollows, and there restrictions, (for particular profile)
//

// What i should implement in my code from instaAuto library
// 1. Storing the data.....
// 2.

// 1. Storing the Data about profiles locally. (on API also is not yet decided.)
// 1.1 What data to store?
//    - followers : [userName]
//    - followings : [userName]
//    - automatedFollowings : [{userName,dateOfFollowing}]
//    - automatedUnfollowings : [{userName,dateOfUnfollowing}]
//    - automatedLikes : [{userName,postURL,dateOfLiking}]
//    - automatedComments : [{userName,postURL,dateOfCommenting}]
//    - automatedUnlikes : [{userName,postURL,dateOfUnliking}]
//    - toAutomateFollowings : [userName]
//    - toAutomateUnfollowings : [userName]
//    - toAutomateLikes : [{userName,postURL}]
//    - toAutomateComments : [{userName,postURL}]
//    - posts : [{postURL,dateOfPost,typeOfPost,description,hashtags}] (type of post could be either video or photo)
//    - comments : [{postURL,dateOfComment,commentText,commentedByUserName}]
//    - likes : [{postURL,dateOfLike,likedByUserName}]
//    - toAutomatePosts : [{pathToContent,description,hashtags}]
// 1.2 Where to store the data?
//    - Local Storage
//    - In path ./data/instaData/{userName-data}.json
// 1.3 Which module to use?
//    - JSONDB
