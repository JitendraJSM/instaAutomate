// NOTE: Develop this script in such a way that it can work with App module and also with out App Module NOTE: without app Module execution of scraper is not possible.
const db = require("./db.js");
const fs = require("fs-extra");
// ============== 👇 Data Scraping Functions 👇 ==============
// ===== Main Scraper function =====
// const scrapeProfile = async function () {     // Old code may be needed until fully developed.
const scrapeInstaProfile = async function (userName) {
  userName ||= this.state.targetToScrape.targetString;

  this.state.targetToScrape.alreadyExistedProfileData = await db.readUserProfileData.call(this, userName);
  // TODO: This is unneccessary to scrape each time followers, followings and metaData as it takes time, data and increase the chances to get banned.
  this.state.targetToScrape.latestScrapedMetaData = await scrapeMetaDataOfProfile.call(this, userName); // This scrapes latest meta Data of profile

  await getInstaProfileScraperConfig.call(this); // NOTE: This function decides what to scrape and what not to scrape.

  if (this.state.targetToScrape.needFollowers || this.state.targetToScrape.needFollowings) {
    const { followers, followings } = await getListOfFollowersOrFollowings.call(
      this,
      this.state.targetToScrape.latestScrapedMetaData.id,
      this.state.targetToScrape.needFollowers,
      this.state.targetToScrape.needFollowings
    );
    this.state.targetToScrape.latestScrapedMetaData.followers = followers;
    this.state.targetToScrape.latestScrapedMetaData.followings = followings;
  }

  this.state.targetToScrape.latestScrapedMetaData.userName = this.state.targetToScrape.latestScrapedMetaData.username;

  const res = await scrapeProfilePosts.call(this);
  console.log(`Posts scraping done by function scrapeProfilePosts: ${res}.`);

  await updateDatabaseAfterProfileScraping.call(this);

  console.log(`Check file scraped data is written or not.`);
};

// ----- To Scrape Meta Data of Profile -----
const scrapeMetaDataOfProfile = async function (userName) {
  if (!userName) throw new Error(`scrapeMetaDataOfProfile Function needs userName of profile as Argument.`);

  /* It is not needed to navigate to user before scraping but it is better so not get banned.*/
  if (this.page.url() !== `https://www.instagram.com/${userName}`) await this.page.navigateTo(`https://www.instagram.com/${userName}`);

  // ------ 👇 Logic to Scrape MetaData of Profile 👇 ------
  // --- Logic for scraping data is copied from "getUserDataFromInterceptedRequest" function of instaAuto git repo of mifi.
  // TODO: This given below code creates a request but it must first use the request interceptor if that won't work then use this.

  let scrapedMetaData;
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
      // this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const json = JSON.parse(await foundResponse.text());
    scrapedMetaData = json.data.user;
  } finally {
    clearTimeout(t);
  }
  return scrapedMetaData;
  // ------ 👆 Logic to Scrape MetaData of Profile 👆 ------
};

// ----- Creates config by compairing alreadyExistedProfileData and scrapedMetaData -----
// TODO: Shift getInstaProfileScraperConfig() to restrictor.js
const getInstaProfileScraperConfig = async function () {
  // 1. needFollowers
  const followersDifference = this.state.targetToScrape.latestScrapedMetaData.edge_followed_by.count - (this.state.targetToScrape.alreadyExistedProfileData?.followers?.length || 0);
  if (followersDifference > 10 && followersDifference < 100) this.state.targetToScrape.needFollowers = true;
  else this.state.targetToScrape.needFollowers = false;

  // 2. needFollowings
  const followingsDifference = this.state.targetToScrape.latestScrapedMetaData.edge_follow.count - (this.state.targetToScrape.alreadyExistedProfileData?.followings?.length || 0);
  if (followingsDifference > 10 && followingsDifference < 100) this.state.targetToScrape.needFollowings = true;
  else this.state.targetToScrape.needFollowings = false;

  // 3. needPosts
  const postsDifference = this.state.targetToScrape.latestScrapedMetaData.edge_owner_to_timeline_media.count - (this.state.targetToScrape.alreadyExistedProfileData?.posts?.length || 0);
  if (postsDifference > 10) this.state.targetToScrape.needPosts = true;
  else this.state.targetToScrape.needPosts = false;

  return true;
};

// ----- Scrape userName of all Followers and Followings of a Profile -----
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
      // await page.goBackToPreviousPage();
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
    // console.log(followers);
  }
  // await goInstaHome.call(this);
  if (needFollowings) {
    followings = await getFollowersOrFollowing({
      userId: targetUserId,
      getFollowers: false,
    });
    // console.log(`followings are as:`);
    // console.log(followings);
  }
  await this.page.navigateTo(`https://www.instagram.com/${this.state.targetToScrape?.targetString}/`);
  // await page.goBackToPreviousPage.call(this);
  return { followers, followings };
};

// ----- Scrape all Posts of a Profile -----
const scrapeProfilePosts = async function () {
  if (!this.state.targetToScrape.needPosts) {
    console.log(`No need to scrape posts as this.state.targetToScrape.needPosts is false.`);
    return true;
  }

  // TODO: This given below statement creates a problem when some posts are already scraped
  if (!this.state.targetToScrape.latestScrapedMetaData.posts) this.state.targetToScrape.latestScrapedMetaData.posts = []; // Initialize posts array if not already initialized

  // Posts Scraping from response
  const extractPostsFromResponse = async function (responseJSON) {
    // Scrape the post nodes & pushes then to this.state.targetToScrape.latestScrapedMetaData.posts
    responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.forEach((postNode) => {
      if (this.state.targetToScrape.latestScrapedMetaData.posts.some((post) => post.code === postNode.node.code)) return;
      try {
        const node = {
          code: postNode.node.code,
          pk: postNode.node.pk,
          caption: postNode.node.caption,
          caption: postNode.node.taken_at, // this is date and time of post upload/1000
          userName: postNode.node.owner.username,
          coauthor_producers: postNode.node.coauthor_producers,
          title: postNode.node.title,
          comment_count: postNode.node.comment_count,
          like_count: postNode.node.like_count,
          product_type: postNode.node.product_type,
          media_type: postNode.node.media_type,
          clips_metadata: postNode.node.clips_metadata,
          comments: postNode.node.comments,
          location: postNode.node?.location,
        };
        if (postNode.node.product_type === "clips") node.video_versions = postNode.node.video_versions[0].url;
        else if (postNode.node.product_type === "feed") {
          node.image_versions2 = postNode.node.image_versions2.candidates[0].url;
          node.accessibility_caption = postNode.node.accessibility_caption;
        } else if (postNode.node.product_type === "carousel_container") {
          node.carousel_media_count = postNode.node.carousel_media_count;
          node.carousel_media = [];
          node.carousel_media_count = postNode.node.carousel_media.forEach((obj, i) => node.carousel_media.push({ url: obj.image_versions2.candidates[0].url, imgIndex: i }));
        }
        this.state.targetToScrape.latestScrapedMetaData.posts.push(node);
      } catch (error) {
        console.log(error);

        console.log(`Cannot extract data from postNade: ${postNode}`);
        console.log(`-=-=-=-=-=-=-=-`);
        console.log(postNode.node.code);
        console.log(`-=-=-=-=-=-=-=-`);
      }
    });

    // Sort posts by taken_at date in descending order
    this.state.targetToScrape.latestScrapedMetaData.posts.sort((a, b) => b.taken_at - a.taken_at);

    // responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info.has_next_page decides to scroll for more posts (true) or all posts are scraped (false).

    if ("has_next_page" in responseJSON.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.page_info) {
      if (responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info.has_next_page) return "scroll";
      else return "stop Scrolling";
    } else {
      console.log(`Please check in debugger mode that why has_next_page does not exists.`);
      await this.utils.askUser("Press Enter to Continue...");
    }
  };

  // Filter function - process requests
  const postsScrapingFilterFn = async (request, response) => {
    if (request.url() === "https://www.instagram.com/graphql/query") {
      const headers = request.headers()["x-fb-friendly-name"];
      console.log("Request Headers:", headers);
      return true;
    }
  };

  // Handler function - successful requests
  const postsScrapingHandlerFn = async (request, response) => {
    if (request.headers()["x-fb-friendly-name"] === "PolarisProfilePostsQuery" || request.headers()["x-fb-friendly-name"] === "PolarisProfilePostsTabContentQuery_connection") {
      const resJSON = await response.json();

      console.log(`==============================================`); // for testing purpose only
      await fs.appendFile("./scraperTesting/responseAsItIs.json", JSON.stringify(resJSON, null, 2) + ",\n"); // for testing purpose only
      console.log(`Currently length of scrapedMetaDataOfPosts is : ${this.state.targetToScrape.latestScrapedMetaData.posts.length}`); // for testing purpose only
      console.log(`==============================================`); // for testing purpose only

      this.state.targetToScrape.scrapingVariables.has_next_page = await extractPostsFromResponse.call(this, resJSON);

      this.state.targetToScrape.scrapingVariables.pagesScraped++;
      // await fs.writeFile("./scraperTesting/extractedPosts.json", JSON.stringify(this.state.currentResourceData.posts, null, 2));
    }
  };
  //
  console.log(`Starting to response Listener for posts scraping ....`);

  this.state.targetToScrape.scrapingVariables = { pagesScraped: 0, has_next_page: true };
  this.state.targetToScrape.removeResponseListener = await this.page.addResponseListener.call(this, postsScrapingFilterFn.bind(this), postsScrapingHandlerFn.bind(this));

  await this.page.navigateTo(`chrome://new-tab-page/`); // Navigate to a new tab to reset the page state
  await this.page.navigateTo(`https://www.instagram.com/${this.state.targetToScrape?.targetString}/`);

  while (this.state.targetToScrape.scrapingVariables.has_next_page !== "stop Scrolling") {
    // if (this.state.targetToScrape.latestScrapedMetaData.posts.length >= this.state.targetToScrape.latestScrapedMetaData.edge_owner_to_timeline_media.count) {
    //   has_next_page = true;
    //   console.log(`Breaking the loop as All posts get scraped.`);
    //   break;
    // }
    await this.utils.randomDelay(1.5, 0.5); // Wait for 1.5 seconds before next request
    if (this.state.targetToScrape.scrapingVariables.has_next_page === "scroll") {
      // Scroll down for next posts requests
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight, { behavior: "smooth" });
      });
      this.state.targetToScrape.scrapingVariables.has_next_page = "wait";
    }
    console.log(`--- After wait for response has_next_page is as: ${this.state.targetToScrape.scrapingVariables.has_next_page}`);
  }

  return true;
};

// ----- Scrape all Datails of a Post (MetaData, likers, Comments) -----
// const scrapeInstaPost = async function () {
//   // 1. Check  if ever this postURL scraped before, (Check if data file for this url exists or not.)
//   // 2. If exists
//   //      2.1  Read already existsed scraped data of that post
//   //      2.2  After reading and storing that data on this.state.alreadyScrapedPostData call restrictor.js to confirm lastScrapingDate for data is already scraped or not.
//   // 3. If not exists then create a new base file for data of a post
//   // 4. Navigate to that postURL
//   // 5. Use page.waitForResponse() to scrape meta data of post with timeout, if not completed then again page.waitForResponse() and reload page again, do this until you get the results.
//   // 6. Store meta data on this.state.latestScrapedMetaData and call again restricor.js to compare and to confirm what to scrape and what not to scrape, is required data already scraped or not and wait for resultObj.
//   //      - resultObj {noOfLikers, noOfLikersScraped, noOfLikersToBeScraped, noOfComments, noOfComments, noOfCommentsToBeScraped }
//   // 7. Update the metaData in file.
//   // 8. For scraping Likers userName from list & all the comments from comments list use the similar methodology that used in "scrapeProfilePosts" function to scrape all posts,
//   // 9. Let me try to explain that methodology
//   // 9.1   function scrapeLikersOfPost
//   //          1. Check is Approved & get resultObj
//   //          2. Check postUrl Page is opened
//   //          3. Define "extractLikersFromResponse"   i.e. Scrape userName of likers from response
//   //          4. Define a Filter function to filter requests similar to "postsScrapingFilterFn"
//   //          5. Define a Handler function that handles the responses of filtered requests similar to "postsScrapingHandlerFn" function
//   //          6. Remaining logic of "scrapeLikersOfPost" should be similar to logic of "scrapeProfilePosts" so that this function scrapes all userNames from a response then scroll down so next request gets triggered only after first response get processed / scraped.
// };
// ===============================================================================
// ========================== likers scrape function =============================
// const scrapeInstaPost = async function () {
//   async function scrapeComments(page) {
//     // const commentContainer = await page.$(".x78zum5.xdt5ytf.x1iyjqo2");   // nope
//     const commentContainer = await page.$(
//       ".html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1"
//     );
//     const commentContainer = await page.$(
//       "html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1"
//     );
//     const commentContainer = await page.$("._ap3a._aaco._aacw._aacx._aad7._aade");
//     return await page.evaluate(() => {
//       // Find comments in the DOM
//       const commentElements = Array.from(document.querySelectorAll('[role="button"][tabindex="0"]'));
//       const comments = [];

//       for (const element of commentElements) {
//         // Look for username and comment text patterns
//         const usernameElement = element.querySelector('a[role="link"]');
//         const commentTextElement = element.querySelector("span:not([role])");

//         if (usernameElement && commentTextElement) {
//           comments.push({
//             username: usernameElement.textContent.trim(),
//             text: commentTextElement.textContent.trim(),
//             timestamp: element.querySelector("time") ? element.querySelector("time").getAttribute("datetime") : null,
//           });
//         }
//       }

//       // Extract post description
//       const postDescription = document.querySelector("h1") ? document.querySelector("h1").textContent : document.querySelector('article span[role="button"] > div > span')?.textContent;

//       return {
//         comments,
//         postDescription,
//       };
//     });
//   }
//   async function scrapePostMetadata() {
//     const metadata = await this.page.evaluate(() => {
//       // Extract Open Graph metadata
//       const ogDescription = document.querySelector('meta[property="og:description"]')?.content;
//       const ogImage = document.querySelector('meta[property="og:image"]')?.content;
//       const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content;

//       // Parse like and comment counts from description
//       let likes = 0;
//       let comments = 0;

//       if (ogDescription) {
//         const likesMatch = ogDescription.match(/(\d+)\s+likes/);
//         const commentsMatch = ogDescription.match(/(\d+)\s+comments/);

//         if (likesMatch) likes = parseInt(likesMatch[1]);
//         if (commentsMatch) comments = parseInt(commentsMatch[1]);
//       }

//       return {
//         title: twitterTitle || document.title,
//         description: ogDescription,
//         imageUrl: ogImage,
//         likes,
//         comments,
//       };
//     });

//     return metadata;
//   }
// };
// ===============================================================================
// ===============================================================================
// ----- Update Data-base with latest information after scraping profile -----
const updateDatabaseAfterProfileScraping = async function () {
  const userName = this.state.targetToScrape.targetString;
  //  1. Update user's Data
  this.state.targetToScrape.latestScrapedMetaData.postsCount = this.state.targetToScrape.latestScrapedMetaData.posts.length;
  this.state.targetToScrape.latestScrapedMetaData.followersCount = this.state.targetToScrape.latestScrapedMetaData.edge_followed_by.count;
  this.state.targetToScrape.latestScrapedMetaData.followingsCount = this.state.targetToScrape.latestScrapedMetaData.edge_follow.count;
  this.state.targetToScrape.latestScrapedMetaData.lastScrapingDate = new Date().toISOString();

  // 2. Get profile in allProfilesData.json
  if (!this?.state?.profilesData) this.state.profilesData = await db.readProfilesData();
  this.state.targetToScrape.profile = this.state.profilesData.find((profile) => profile.userName === userName);

  // 3. Update allProfilesData.json
  this.state.targetToScrape.profile.postsCount = this.state.targetToScrape.latestScrapedMetaData.postsCount;
  this.state.targetToScrape.profile.followersCount = this.state.targetToScrape.latestScrapedMetaData.followersCount;
  this.state.targetToScrape.profile.followingsCount = this.state.targetToScrape.latestScrapedMetaData.followingsCount;
  this.state.targetToScrape.profile.lastScrapingDate = new Date().toISOString();

  await db.removeDueTask(this.state.currentProfile.userName, {
    parentModuleName: "instaScraper",
    actionName: "targetScraper",
    argumentsString: `${this.currentAction.argumentsString}`,
  });

  await db.writeUserProfileData.call(this, { ...this.state.targetToScrape.alreadyExistedProfileData, ...this.state.targetToScrape.latestScrapedMetaData });
  await db.writeProfilesData.call(this, this.state.profilesData);

  return true;
  // this.state.targetToScrape.profile.postsDownloaded ||= 0;   // This data should only be mutated in instaMediaDownloader.js
  // this.state.targetToScrape.latestScrapedMetaData.postsDownloaded ||= 0;   // This data should only be mutated in instaMediaDownloader.js
  // this.state.targetToScrape.profile.postsEdited ||= 0;     // This data should only be mutated in mediaEditor.js
  // this.state.targetToScrape.latestScrapedMetaData.postsEdited ||= 0;     // This data should only be mutated in mediaEditor.js
  // this.state.targetToScrape.profile.postsReadyToUpload ||= 0;     // This data should only be mutated in mediaEditor.js
  // this.state.targetToScrape.latestScrapedMetaData.postsReadyToUpload ||= 0;     // This data should only be mutated in mediaEditor.js
};

const targetStringAnalyzer = async function (targetString) {
  if (!targetString) throw new Error("Target string (as argument) is required for targetStringAnalyzer Function.");

  // 1. Analyze the targetString to identify the type of scraping required (e.g., user profile, hashtag, location).
  let targetStringType;
  if (!targetString.startsWith("https://www.instagram.com/")) targetStringType = "userName";
  else if (targetString.includes("/p/")) targetStringType = "postUrl"; // i.e. a post modal window opened, it can be a image post or video post or carousel post.
  else if (targetString.includes("/reels/")) targetStringType = "reelsHomePageUrl"; // i.e. Reels home page ex. https://www.instagram.com/nanu_cute_00/reels/.
  else if (targetString.includes("/reel/")) targetStringType = "reelUrl"; // i.e. a reel modal window opened, it is a video post. ex. https://www.instagram.com/reel/DLKZmEATRYH/
  else if (targetString.includes("/highlights/")) targetStringType = "highlightsUrl"; // ex. https://www.instagram.com/stories/its_cute_girl__85/
  else if (targetString.includes("/stories/")) targetStringType = "storiesUrl";
  else throw new Error(`Target String: ${targetString} doesn't fall into any category.`);
  return targetStringType;
};

const targetScraper = async function (targetString) {
  if (!targetString) throw new Error(`targetScraper Function needs a URL string targetString as Argument.`);
  this.state.targetToScrape = { targetString };
  this.state.targetToScrape.targetStringType = await targetStringAnalyzer.call(this, this.state.targetToScrape.targetString);
  if (this.state.targetToScrape.targetStringType === "userName") await scrapeInstaProfile.call(this);
  if (this.state.targetToScrape.targetStringType === "postUrl") await scrapeInstaPost.call(this);
  console.log(`-=-=- Target Scraping Completed. -=-=-`);
};
targetScraper.doNotParseArgumentsString = true; // This is used to skip parsing of argumentsString as it is not needed here.

const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  targetScraper: catchAsync(targetScraper),
  scrapeMetaDataOfProfile: catchAsync(scrapeMetaDataOfProfile),
};
