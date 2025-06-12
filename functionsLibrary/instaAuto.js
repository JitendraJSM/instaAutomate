const utils = require("../utils/utils.js");
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

const db = require("./db.js");

// ======= Event Listeners =======
const startListeners = async function () {
  this.on("follow", async (userObject) => {
    await this.db.updateDatabaseOnFollow.call(this, userObject);
  });
  console.log(`Listeners started.`);
};

// ======= DB Functions =======

const updateUserData = async function (needUpadte) {
  let userData;

  userData = await db.readUserProfileData(this.state.currentProfile);
  if (!needUpadte) {
    needUpadte = true;
    if (userData.lastUpdate) {
      // Check if last update was more than 24 hours ago (86400000 ms = 1 day)
      const timeDiff = new Date() - new Date(userData.lastUpdate);
      if (timeDiff < 86400000) needUpadte = false;
    }
  }

  if (needUpadte) {
    console.log(`UserData of ${this.state.currentProfile.userName} needs to be updated.`);

    const scrapedUserData = await scrapeUserData.call(this, this.state.currentProfile.userName);

    this.state.currentProfile.postsCount = scrapedUserData.edge_owner_to_timeline_media.count;
    this.state.currentProfile.followersCount = scrapedUserData.edge_followed_by.count;
    this.state.currentProfile.followingsCount = scrapedUserData.edge_follow.count;
    this.state.currentProfile.mutualFollowersCount = scrapedUserData.edge_mutual_followed_by.count;
    this.state.currentProfile = {
      ...scrapedUserData,
      ...this.state.currentProfile,
    }; // Fixed variable name from scrapeUserData to scrapedUserData
    this.state.currentProfile.automatedFollow = [];
    this.state.currentProfile.automatedUnfollow = [];
    this.state.currentProfile.automatedlike = [];
    this.state.currentProfile.automatedcomment = [];
    this.state.currentProfile.lastUpdate = new Date().toISOString();
    await db.writeUserProfileData.call(this, this.state.currentProfile);

    // console.log(`UserData of ${this.state.currentProfile.userName}'s this.state.currentProfile is as: .`);
    // console.log(this.state.currentProfile);
  } else console.log(`UserData of ${this.state.currentProfile.userName} does not need an updated.`);
};

// ======= Main Functions =======
const goInstaHome = async function () {
  try {
    const pageUrl = this.page.url();
    if (pageUrl.includes(`https://www.instagram.com`) && !pageUrl.includes("graphql")) await this.page.clickNotClickable(`[aria-label="Home"]`);
    else throw new Error("Failed to click home button");
    console.log(`Home button clicked.`);
  } catch (error) {
    console.log(`Home Button of Instagram is not availble so going to navigate home page for : ${this.state.currentProfile.userName}`);
    if (this.page.url() !== `https://www.instagram.com/${this.state.currentProfile.userName}`) await this.page.navigateTo(`https://www.instagram.com/${this.state.currentProfile.userName}/`);
  }

  await this.utils.randomDelay(1.25, 0.25);
  this.page.waitForPageLoad();
};

const scrapeUserData = async function (userName, needFollowers = true, needFollowings = true) {
  // const userName = "diwanshi1619";
  // const userName = "best.frnds.jsm";
  /* It is not needed to navigate to user before scraping but it is better so not get banned.*/
  if (this.page.url() !== `https://www.instagram.com/${userName}`) await this.page.navigateTo(`https://www.instagram.com/${userName}`);

  let scrapedData;
  // --- Logic for scraping data is copied from "getUserDataFromInterceptedRequest" function of instaAuto git repo of mifi.
  const t = setTimeout(async () => {
    console.log("Unable to intercept request, will send manually");
    try {
      await this.page.evaluate(async (username2) => {
        const response = await window.fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username2.toLowerCase())}`, {
          mode: "cors",
          credentials: "include",
          headers: { "x-ig-app-id": "936619743392459" },
        });
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
            new RegExp(`https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/users\\/web_profile_info\\/\\?username=${encodeURIComponent(userName.toLowerCase())}`).test(request.url())
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
  console.log(`Number of Posts are: ${scrapedData.edge_owner_to_timeline_media.count}`);
  console.log(`followers are: ${scrapedData.edge_followed_by.count}`);
  console.log(`followings are: ${scrapedData.edge_follow.count}`);
  console.log(`mutual followers are: ${scrapedData.edge_mutual_followed_by.count}`);
  console.log(`1st mutual follower: ${scrapedData.edge_mutual_followed_by.edges[0]}`);

  // Logic to get followers and followings also

  if (needFollowers || needFollowings) {
    const { followers, followings } = await getListOfFollowersOrFollowings.call(this, scrapedData.id, needFollowers, needFollowings);
    scrapedData.followers = followers;
    scrapedData.followings = followings;
  }

  return scrapedData;
};

const getListOfFollowersOrFollowings = async function (targetUserId, needFollowers, needFollowings) {
  console.log(`Starting to get list of followers or followings...`);

  let page = this.page;
  const instagramBaseUrl = "https://www.instagram.com";

  async function getPageJson() {
    return JSON.parse(await (await (await page.$("pre")).getProperty("textContent")).jsonValue());
  }
  async function* graphqlQueryUsers({ queryHash, getResponseProp, graphqlVariables: graphqlVariablesIn }) {
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
        // logger.log(`Has more pages (current ${i})`);
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for 1 second before next request
      }

      yield ret;
    }

    return outUsers;
  }
  function getFollowersOrFollowingGenerator({ userId, getFollowers = false }) {
    return graphqlQueryUsers({
      getResponseProp: (json) => json.data.user[getFollowers ? "edge_followed_by" : "edge_follow"],
      graphqlVariables: { id: userId },
      queryHash: getFollowers ? "37479f2b8209594dde7facb0d904896a" : "58712303d941c6855d4e888c5f0cd22f",
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

const follow = async function (userName, likeOptions) {
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

  await like.call(this, { userName });

  const followBTN = await this.page.locator(`button ::-p-text(Follow)`).waitHandle();
  // Bring followBTN into view
  await this.page.evaluate(
    (element) =>
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      }),
    followBTN
  );
  await this.utils.randomDelay(1.5, 0.9);
  let followButtonTextBefore = await this.page.getText(followBTN);
  if (followButtonTextBefore === "Following") {
    console.log(`Already following ${userName}`);
    return;
  }

  await this.page.clickNotClickable(`::-p-text(Follow)`);

  async function waitForFollowingDone(followBTN) {
    let followButtonTextAfter = await this.page.getText(followBTN);
    return followButtonTextAfter === "Following";
  }
  await this.monitor.robustPolling(waitForFollowingDone.bind(this), { rejectOnEnd: false, waitForFunctionCompletion: true }, followBTN);

  const userObject = { userName, date: new Date().toISOString() };
  this.emit("follow", userObject);
};
follow.doNotParseArgumentString = true;

const like = async function (likeOptions) {
  const { userName, minNumberOfPostsToLike = 1, maxNumberOfPostsToLike = 5 } = likeOptions;
  // 0. Check the User Page is opened or not if not then open it.
  if (this.page.url() !== `https://www.instagram.com/${userName}`) await this.page.navigateTo(`https://www.instagram.com/${userName}/`);
  console.log(`navigation done`);

  // 1. Get all available posts elements.
  const likeSelector = `a[href^="/roshnigupta0075/reel/"], a[href^="/roshnigupta0075/p/"]`;
  const postsElementsArr = await this.page.$$(likeSelector);
  console.log(`postsElementsArr is as: ${postsElementsArr.length}`);

  if (postsElementsArr.length === 0) {
    console.log(`No posts found for ${userName}`);
    return;
  }

  // 2. Get a random number that how many posts to like.
  if (postsElementsArr.length < maxNumberOfPostsToLike) maxNumberOfPostsToLike = postsElementsArr.length;
  const numberOfPostsToLike = this.utils.getRandomNumber(minNumberOfPostsToLike, maxNumberOfPostsToLike);

  for (let i = 0; i < numberOfPostsToLike; i++) {
    // Get a random post index that hasn't been liked yet
    const randomPostIndex = this.utils.getRandomNumber(0, postsElementsArr.length - 1);
    console.log(`randomPostIndex is as: ${randomPostIndex}`);

    const postElement = postsElementsArr[randomPostIndex];

    // Remove the selected post from array so it's not picked again
    postsElementsArr.splice(randomPostIndex, 1);

    // Bring postElement into view
    await this.page.evaluate(
      (element) =>
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        }),
      postElement
    );
    await this.utils.randomDelay(2, 1);
    // Click on the post to open it
    await this.page.clickNotClickable(postElement);
    await this.utils.randomDelay(2, 1);

    // Click like button if not already liked
    const hitTheLikeButton = async function () {
      const likeButton = await this.page.locator(`[aria-label$="ike"][height="24"][width="24"]`).waitHandle();
      const getAriaLabel = async () => await this.page.evaluate((element) => element.ariaLabel, likeButton);
      const likeButtonAriaLabel = await getAriaLabel();
      console.log(`ariaLabel is as: ${likeButtonAriaLabel}`);
      console.log(`Like button clicked for ${userName} post ${i + 1} of ${numberOfPostsToLike} like`);
      if (likeButtonAriaLabel === "Like") {
        await this.page.clickNotClickable(likeButton);
        await this.utils.randomDelay(1.5, 1);
      } else if (likeButtonAriaLabel === "Unlike") {
        console.log(`Already liked this post.`);
        return true;
      }
      const result = (await getAriaLabel()) === "Unlike";
      return result;
    };
    //  Monitor is added as this scripts works so fast that even the click on like button is not completed, so monitor just confirms that like button is clicked.
    await this.monitor.robustPolling(hitTheLikeButton.bind(this), {
      maxAttempts: 5,
      intervalMs: 1000,
      rejectOnEnd: false,
      waitForFunctionCompletion: true,
    }); // todo: add a delay between like and following.

    // Close the post modal
    await this.page.clickNotClickable(`[aria-label="Close"]`);
    await this.utils.randomDelay(2, 1);
  }
  console.log(`Random Post likes is Completed.`);
};

const performDueTasks = async function () {
  const agentPreDueTasks = [
    {
      expression: `this.state.profileTarget = ${this.state.currentProfile.profileTarget}*1`,
    },
    {
      parentModuleName: "chrome",
      actionName: "initializeBrowser",
    },
  ];
  const agentPostDueTasks = [
    {
      parentModuleName: "chrome",
      actionName: "closeBrowser",
    },
  ];
  const dueTasks = this.state.currentProfile.dueTasks;
  this.task.splice(this.currentActionIndex + 1, 0, ...agentPreDueTasks, ...dueTasks, ...agentPostDueTasks);
};

/*const performDueTasks = async function () {
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
  this.state.profileTarget = this.state.currentProfile.profileTarget;
  // 1. Initialize the browser
  await this.chrome.initializeBrowser.call(this);
  // 2. Get dueTasks Array of currentProfile
  const dueTasks = this.state.currentProfile.dueTasks;
  console.log(`-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-xx-x-x-x-xx-x-x-`);
  console.log(this.state.currentProfile.dueTasks);
  console.log(`-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-xx-x-x-x-xx-x-x-`);
  console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-=-=-==-=-=-`);
  console.log(this);
  console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-=-=-==-=-=-`);
  await this.utils.devWaitCheckContinue();

  const stateFilePath = path.join(__dirname, "../data/instaData/stateAtCompletion.json");
  fs.writeFileSync(stateFilePath, JSON.stringify(this.state, null, 2));
  console.log(`State written to ${stateFilePath}`);

  // await follow.call(this, "riya9669singh");
  // await follow.call(this, "sona_sengupta_");
  // await follow.call(this, "roshnigupta0075");
};*/

// ======= Controller Functions =======

const instaAutomation = async function () {
  /*
  await addDueTask("manisha.sen.25", { updateUserData: true });
  await addDueTasks("manisha.sen.25", { follow: true, userName: "jitendra_swami_007" });
  await addDueTasks("manisha.sen.25", { follow: true, userName: "jitendra_swami_008" });
  await removeDueTask("manisha.sen.25", { follow: true, userName: "jitendra_swami_007" });
  await removeDueTask("manisha.sen.25", { follow: true, userName: "jitendra_swami_008" });
  */

  // this.state.profilesData = await db.readProfilesData(); // Done in initialTask.json
  // await startListeners.call(this); // Done in initialTask.json

  /* const userInput = await this.utils.askUser(`Do you want to add new profile? (y/n): `);
  if (userInput.toLowerCase() === "y") {
    const addNewProfileResponse = await addNewProfile.call(this);
    if (!addNewProfileResponse) throw new Error(`Failed to add new profile`);
  }*/ // Shifted to db.js and Done in initialTask.json

  /*  // As agent's dueTasks are more important than scraper's dueTasks.
  this.state.profilesToLoop = this.state.profilesData.filter((profile) => profile.type === "agent");
  // console.log(this.state.profilesToLoop);
  if (this.state.profilesToLoop.length === 0) throw new Error(`No profiles to loop`);*/ // Shifted to db.js and Done in initialTask.json

  this.state.currentProfileIndex = 0;
  while (this.state.currentProfileIndex < this.state.profilesToLoop.length) {
    this.state.currentProfile = this.state.profilesToLoop[this.state.currentProfileIndex];

    console.log(`currentProfile to loop over is as: `);
    console.log(this.state.currentProfile);
    console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
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
  // console.log(`---- All Tasks Added ----`);
};

const scrapeContentOfUser = async function () {};

// module.exports = Instauto;
// === Interface ===
const catchAsync = require("../utils/catchAsync.js");
const fs = require("fs");
const path = require("path");
module.exports = {
  instaAutomation: catchAsync(instaAutomation),
  updateUserData: catchAsync(updateUserData),
  follow: catchAsync(follow),
  like: catchAsync(like),
  startListeners: catchAsync(startListeners),
  scrapeUserData: catchAsync(scrapeUserData),
  getListOfFollowersOrFollowings: catchAsync(getListOfFollowersOrFollowings),
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
