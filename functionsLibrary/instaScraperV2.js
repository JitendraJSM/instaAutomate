const db = require("./db.js");
const fs = require("fs-extra");
// ========= Flow =========
// 1. targetScraper called with a targetString
//      - 1.1 Creates targetToScrape on this.state
//      - 1.2 Calls targetStringAnalyzer to determine the type of targetString i.e. targetToScrape.targetStringType.
//      - 1.3 On the basis of targetStringType
//              - if userName then function scrapeInstaProfile gets called to scrape the profile whose userName is targetString.
//              - if postUrl then function scrapeInstaPost gets called to scrape the post whose url is targetString.

// ------ 1. targetToScrape function ------
const targetScraper = async function (targetString) {
  // if (!targetString) throw new Error(`targetScraper Function needs a URL string targetString as Argument.`);

  this.state.targetToScrape ||= { targetString };

  this.state.targetToScrape.targetStringType = await targetStringAnalyzer.call(this);

  if (this.state.targetToScrape.targetStringType === "userName") await scrapeInstaProfile.call(this);
  else if (this.state.targetToScrape.targetStringType === "postUrl") await scrapeInstaPost.call(this);

  console.log(`-=-=- Target Scraping Completed. -=-=-`);
};
targetScraper.doNotParseArgumentsString = true; // This is used to skip parsing of argumentsString as it is not needed here.

// ------ 2. targetStringAnalyzer function ------
const targetStringAnalyzer = async function (targetString) {
  targetString ||= this.state.targetToScrape.targetString;

  // 1. Analyze the targetString to identify the type of scraping required (e.g., user profile, hashtag, location).
  let targetStringType;
  if (!targetString.startsWith("https://www.instagram.com/")) targetStringType = "userName";
  //   TODO: add one more else if for instagram profile url, that gives profileURL or just extract user name from that and replace target string by user name and then return targetStringType as userName.
  //   TODO: as targetStringAnalyzer function it is responsibility of this function to check that userName or postUrl or other url really exists or not.
  //            - use node fetch to request to instagram to check the targetString's relaiblity, for that intercrpt requests.
  else if (targetString.includes("/p/")) targetStringType = "postUrl"; // i.e. a post modal window opened, it can be a image post or video post or carousel post.
  else if (targetString.includes("/reels/")) targetStringType = "reelsHomePageUrl"; // i.e. Reels home page ex. https://www.instagram.com/nanu_cute_00/reels/.
  else if (targetString.includes("/reel/")) targetStringType = "reelUrl"; // i.e. a reel modal window opened, it is a video post. ex. https://www.instagram.com/reel/DLKZmEATRYH/
  else if (targetString.includes("/highlights/")) targetStringType = "highlightsUrl"; // ex. https://www.instagram.com/stories/its_cute_girl__85/
  else if (targetString.includes("/stories/")) targetStringType = "storiesUrl";
  else throw new Error(`Target String: ${targetString} doesn't fall into any category of targetStringType.`);
  return targetStringType;
};

// =-=-=-=-=-=-= 👇 Profile Scraping function 👇 =-=-=-=-=-=-=

// ------ 3. scrapeInstaProfile function ------
const scrapeInstaProfile = async function (userName) {
  userName ||= this.state.targetToScrape.targetString;

  this.state.targetToScrape.alreadyExistedProfileData = await db.readUserProfileData.call(this, userName);
  // Check if we need to scrape based on lastScrapingDate and MIN_DAYS_TO_CHECK_RESOURCE
  if (!this.state.targetToScrape.mustScrapeProfile && this.state.targetToScrape.alreadyExistedProfileData.lastScrapingDate) {
    const lastScrapingDate = new Date(this.state.targetToScrape.alreadyExistedProfileData.lastScrapingDate);
    const today = new Date();
    const diffDays = Math.floor((today - lastScrapingDate) / (1000 * 60 * 60 * 24));
    const minDays = parseInt(process.env.MIN_DAYS_TO_CHECK_RESOURCE, 10) || 0;
    if (diffDays < minDays) {
      console.log(`Skipping scraping. Only ${diffDays} days since last scrape. Minimum required: ${minDays} days.`);
      return true;
    }
  }
  // TODO: This is unneccessary to scrape each time followers, followings and metaData as it takes time, data and increase the chances to get banned. Done in above if.
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
  return true;
};

// ------ 4. To Scrape Meta Data of Profile ------
const scrapeMetaDataOfProfile = async function (userName) {
  userName ||= this.state.targetToScrape.targetString;

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

// ------ 5. Creates config by compairing alreadyExistedProfileData and scrapedMetaData ------
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

// ------ 6. Scrape userName of all Followers and Followings of a Profile ------
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

// ------ 7. Scrape all Posts of a Profile ------
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
  const postsScrapingFilterFn = async (request, response) =>
    request.url() === "https://www.instagram.com/graphql/query" &&
    request.headers()["x-fb-friendly-name"] &&
    (request.headers()["x-fb-friendly-name"] === "PolarisProfilePostsQuery" || request.headers()["x-fb-friendly-name"] === "PolarisProfilePostsTabContentQuery_connection");

  // Handler function - successful requests
  const postsScrapingHandlerFn = async (request, response) => {
    const resJSON = await response.json();

    console.log(`Currently length of scrapedMetaDataOfPosts is : ${this.state.targetToScrape.latestScrapedMetaData.posts.length}`); // for testing purpose only

    this.state.targetToScrape.scrapingVariables.has_next_page = await extractPostsFromResponse.call(this, resJSON);

    this.state.targetToScrape.scrapingVariables.pagesScraped++;
  };
  //
  console.log(`Starting to response Listener for posts scraping ....`);

  this.state.targetToScrape.scrapingVariables = { pagesScraped: 0, has_next_page: true };
  this.state.targetToScrape.removeResponseListener = await this.page.addResponseListener.call(this, postsScrapingFilterFn.bind(this), postsScrapingHandlerFn.bind(this));

  await this.page.navigateTo(`chrome://new-tab-page/`); // Navigate to a new tab to reset the page state
  await this.page.navigateTo(`https://www.instagram.com/${this.state.targetToScrape?.targetString}/`);

  while (this.state.targetToScrape.scrapingVariables.has_next_page !== "stop Scrolling") {
    await this.utils.randomDelay(1.5, 0.5); // Wait for 1.5 seconds before next request

    if (this.state.targetToScrape.scrapingVariables.has_next_page === "scroll") {
      // Scroll down for next posts requests
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight, { behavior: "smooth" });
      });
      this.state.targetToScrape.scrapingVariables.has_next_page = "wait";
    }
    // console.log(`--- After wait for response has_next_page is as: ${this.state.targetToScrape.scrapingVariables.has_next_page}`);
  }

  return true;
};

// ------ 8. Update Data-base with latest information after scraping profile ------
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

// =-=-=-=-=-=-= ☝ Profile Scraping function 👆 =-=-=-=-=-=-=

// =-=-=-=-=-=-= 👇 POST Scraping function 👇 =-=-=-=-=-=-=

// ------ 9. Extract post metadata from meta tags ------
// NOTE: this function Works in page context
const extractPostMetadata = async () => {
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const metaContent = descriptionMeta ? descriptionMeta.getAttribute("content") : "";

  // Parse metadata using regex
  const likesMatch = metaContent.match(/(\d+(?:,\d+)*) likes/);
  const commentsMatch = metaContent.match(/(\d+(?:,\d+)*) comments/);
  const usernameMatch = metaContent.match(/- ([\w._]+) on/);
  const dateMatch = metaContent.match(/on ([\w\s,]+):/);

  // Use split method instead of regex for description extraction
  let description = metaContent.split(":").at(-1).trim();

  // Process the description: remove quotes and extract hashtags
  let caption = "";
  let hashtags = [];

  if (description) {
    // Remove quotes from the beginning and end of the description
    description = description.replace(/^\"|\"\.$|\"\.?$/g, "");

    // Extract hashtags using regex
    const hashtagRegex = /#[\w\u0080-\uFFFF]+/g;
    hashtags = description.match(hashtagRegex) || [];

    // Remove hashtags from the caption
    caption = description;
    hashtags.forEach((tag) => {
      caption = caption.replace(tag, "");
    });

    // Clean up the caption (remove extra spaces, newlines, etc.)
    caption = caption.replace(/\s+/g, " ").trim();
  }

  return {
    likesCount: likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) : 0,
    commentsCount: commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, "")) : 0,
    username: usernameMatch ? usernameMatch[1] : "",
    postDate: dateMatch ? dateMatch[1] : "",
    description: description,
    caption: caption,
    hashtags: hashtags,
  };
};

// ------ 10. Extract media ID for potential video content ------
// NOTE: this function Works in page context
const getMediaId = () => {
  const mediaMetaTag = document.querySelector('meta[property="al:ios:url"]');
  if (!mediaMetaTag) return null;

  const mediaContent = mediaMetaTag.getAttribute("content");
  const mediaIdMatch = mediaContent.match(/id=(\d+)/);
  return mediaIdMatch ? mediaIdMatch[1] : null;
};

// ------ 11. Likes Scraper ------
const likesScraper = async function () {
  console.log(`likeScraper function started....`);

  this.state.targetToScrape = {}; // temporary defining as it is not completely integrated.

  await this.page.navigateTo("https://www.instagram.com/p/DKZ10yvzEqS/");

  const metadata = await this.page.evaluate(extractPostMetadata);

  const mediaId = await this.page.evaluate(getMediaId);

  const likers = [];

  // Click to open likers modal
  await this.page.clickNotClickable(`span ::-p-text(${metadata.likesCount} likes)`);

  // Wait for the likers response
  const likersResponse = await this.page.waitForResponse((response) => response.url() === `https://www.instagram.com/api/v1/media/${mediaId}/likers/` && response.status() === 200, { timeout: 60000 });

  // Process likers data
  const likersData = await likersResponse.json();
  likersData.users.forEach((liker) => {
    if (likers.some((l) => l.userName === liker.username)) return; // Skip if liker already exists
    likers.push({
      id: liker.pk,
      userName: liker.username,
      fullName: liker.full_name,
    });
  });
  // await fs.appendFile("./scraperTesting/responseAsItIs.json", JSON.stringify(likersData, null, 2) + ",\n");
  console.log(`Likers data intercepted successfully`);

  return true;
};

// ------ 12. Comments Scraper function ------
const commentsScraper = async function (url) {
  await this.page.navigateTo(url);
  console.log(`ok`);

  // NOTE: this function Works in page context
  const determineTypeOfPage = () => {
    const rootElement = document.querySelector('[id^="mount"]');
    const idOfRootElement = rootElement.id;

    let typeOfPage;
    if (document.querySelector("._a9z6._a9za") !== null) typeOfPage = "type1";
    else if (document.querySelector(".x5yr21d.xw2csxc.x1odjw0f.x1n2onr6") !== null) typeOfPage = "type2";

    if (typeOfPage === "type1") {
      return { typeOfPage, idOfRootElement, containerSelector: "._a9z6._a9za", commentElementSelector: "._a9ym" };
    } else if (typeOfPage === "type2") {
      return {
        typeOfPage,
        idOfRootElement,
        containerSelector: ".x5yr21d.xw2csxc.x1odjw0f.x1n2onr6",
        commentElementSelector:
          ".html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1uhb9sk.x1plvlek.xryxfnj.x1iyjqo2.x2lwn1j.xeuugli.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1:not(:has(> span))",
      };
    }
  };

  const res = await this.page.evaluate(determineTypeOfPage);
  console.log(res);
  const { typeOfPage, idOfRootElement, containerSelector, commentElementSelector } = res;

  //  Scroll & click "Load more comments" button, wait and checks for more new comments loaded or not
  //  if more new comments loaded it returns true
  //  if more new comments not loaded it returns false
  const loadMoreCommentsBTN = async function () {
    let isMoreCommentsLoaded = false;

    // Get initial state of container
    // NOTE: this function Works in page context
    const getContainerState = (containerSelector, commentElementSelector) => {
      const container = document.querySelector(containerSelector);
      if (!container) return null;
      const numOfCommentsInDOM = document.querySelectorAll(commentElementSelector).length;

      return {
        numOfCommentsInDOM,
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
    };

    // Function to scroll down in comments container
    // NOTE: this function Works in page context
    const scrollDownInCommentsDataBox = (containerSelector) => {
      const container = document.querySelector(containerSelector);
      if (container) {
        container.scrollTop = container.scrollHeight;
        return true;
      }
      return false;
    };

    // Check LoadMoreCommentsBTN is available or not if exists then it returns true
    // NOTE: this function Works in page context
    const checkIsBTNExists = async function () {
      const btn = document.querySelector('svg[aria-label="Load more comments"]');
      return btn !== null;
    };

    const checkIsMoreCommentsLoaded = async function (beforeState) {
      // Wait a moment for content to load
      await this.utils.randomDelay(1, 2); // Adjust delay as needed
      // await this.page.waitForNetworkIdle();

      // Get state after clicking
      const afterState = await this.page.evaluate(getContainerState, containerSelector, commentElementSelector);
      if (!afterState) {
        console.log(`Comments Container (ie. ${containerSelector}) not found after clicking`);
        return false;
      }

      // Compare states to determine if click was successful
      const isSuccess = afterState.numOfCommentsInDOM > beforeState.numOfCommentsInDOM || afterState.scrollHeight > beforeState.scrollHeight;

      if (isSuccess) console.log(` - ${afterState.numOfCommentsInDOM - beforeState.numOfCommentsInDOM}, More Comments loaded.`);
      else console.log(`No New comments loaded.`);

      return isSuccess;
    };

    // Get state before clicking
    const beforeState = await this.page.evaluate(getContainerState, containerSelector, commentElementSelector);
    if (!beforeState) {
      console.log(`Comments Container (ie. ${containerSelector}) not found before clicking`);
      return false;
    }
    // Try scrolling down first
    // const scrolled = scrollDownInCommentsDataBox(); // Will not works as scrollDownInCommentsDataBox function Works in page context
    const scrolled = await this.page.evaluate(scrollDownInCommentsDataBox, containerSelector);
    if (!scrolled) console.log(`Try but cannot scroll in Comments Container.`);

    isMoreCommentsLoaded = await checkIsMoreCommentsLoaded.call(this, beforeState);
    if (isMoreCommentsLoaded) return isMoreCommentsLoaded;

    const isBTNExists = await this.page.evaluate(checkIsBTNExists);
    if (!isBTNExists) return isBTNExists;

    // Click the button
    await this.page.clickNotClickable('svg[aria-label="Load more comments"]');

    isMoreCommentsLoaded = await checkIsMoreCommentsLoaded.call(this, beforeState);
    return isMoreCommentsLoaded;
  };

  // NOTE: this function Works in page context
  const checkForEndOfCommentsContainer = () => {
    const viewHiddenCommentsElement = document.querySelector('[aria-label="View hidden comments"]');
    return viewHiddenCommentsElement !== null;
  };

  // Function to extract comments from DOM
  // NOTE: this function Works in page context
  const extractComments = (commentElementSelector) => {
    const commentElements = document.querySelectorAll(commentElementSelector);
    const commentsArray = Array.from(commentElements).map((el) => el.innerText);

    // Parse comments into structured objects
    return commentsArray
      .map((comment) => {
        const parts = comment.split("\n");
        if (parts.length >= 2) {
          return {
            username: parts[0],
            text: parts[1],
            metadata: parts.slice(2).join(" "), // Time, likes, reply info
          };
        }
        return null;
      })
      .filter(Boolean); // Remove any null entries
  };

  // Main execution
  try {
    // Get post metadata
    // const metadata = await extractPostMetadata(); // NOTE: this function Works in page context
    const metadata = await this.page.evaluate(extractPostMetadata);
    metadata.typeOfPage = typeOfPage;
    metadata.idOfRootElement = idOfRootElement;
    // const mediaId = getMediaId();   // NOTE: this function Works in page context
    const mediaId = await this.page.evaluate(getMediaId);

    // Initialize comments collection with deduplication
    const uniqueComments = new Map();
    let loadAttempts = 0;
    const MAX_LOAD_ATTEMPTS = 20; // Prevent infinite loops

    // First extraction of available comments
    // let currentComments = extractComments(); // Will not works as extractComments function Works in page context
    let currentComments = await this.page.evaluate(extractComments, commentElementSelector);

    currentComments.forEach((comment) => {
      uniqueComments.set(comment.username + "|" + comment.text, comment);
    });

    // Continue loading comments until we have all or reach max attempts
    while (uniqueComments.size < metadata.commentsCount && loadAttempts < MAX_LOAD_ATTEMPTS) {
      // If scrolling didn't work or we're at the bottom, try clicking "Load more"

      const isMoreCommentsLoaded = await loadMoreCommentsBTN.call(this);

      if (isMoreCommentsLoaded) loadAttempts = 0;
      else {
        loadAttempts++;
        console.log(`Load more comments try number ${loadAttempts} failed. `);
        continue;
      }

      // Extract newly loaded comments
      // currentComments = extractComments();  // Will not works as extractComments function Works in page context
      currentComments = await this.page.evaluate(extractComments, commentElementSelector);
      currentComments.forEach((comment) => {
        uniqueComments.set(comment.username + "|" + comment.text, comment);
      });

      const isEndOfCommentsContainer = await this.page.evaluate(checkForEndOfCommentsContainer);
      if (isEndOfCommentsContainer) {
        console.log(`Breaking the loop as View Hidden comments BTN appeared in container.`);
        break;
      }
      if (uniqueComments.size === metadata.commentsCount) {
        console.log(
          `Breaking the loop as total comments scraped is equal to total comments in the post.(ie uniqueComments.size: ${uniqueComments.size} and metadata.commentsCount: ${metadata.commentsCount})`
        );
        break;
      }
    }
    // ---- 👇 temp for checking 👇 ----
    const returnObj = {
      postMetadata: metadata,
      mediaId,
      comments: Array.from(uniqueComments.values()),
      totalCommentsScraped: uniqueComments.size,
    };
    // postURL = "https://www.instagram.com/chandani144__/reel/DMA1p8ahX33/"

    const parentFolderPath = path.join(__dirname, `../data/instaScrapedData/postsData/${metadata.username}`);
    // Ensure logs directory exists
    await fs.ensureDir(parentFolderPath);

    const postCode = url.split("/").at(-2);
    const fileName = `${postCode}.json`;
    const filePath = path.join(parentFolderPath, fileName);
    await fs.writeFile(filePath, JSON.stringify(returnObj, null, 2));
    // ---- 👆 temp for checking 👆 ----

    // Prepare final result
    return {
      postURL: url,
      postMetadata: metadata,
      mediaId,
      comments: Array.from(uniqueComments.values()),
      totalCommentsScraped: uniqueComments.size,
    };
  } catch (error) {
    console.error("Error scraping post and comments:", error);
    return { error: error.message };
  }

  // Check btn is clicked or not
  // Create a function that checks if the button is clicked or not
  // Apply this trick to check if the button is clicked or not
  // first check the number of child elements in the container brfore clicking the button
  //  Check the height of the container before clicking the button
  // then click the button using await this.page.clickNotClickable('svg[aria-label="Load more comments"]');
  // then check the number of child elements in the container after clicking the button
  //  Check the height of the container after clicking the button
  // if the number of child elements is increased and the height of the container is increased then the button is clicked
  // if the number of child elements is same and the height of the container is same then the button is not clicked in that case random wait for 1 to 2 seconds and click the button again and check again and so on until the button is clicked.

  console.log(`====================================-===-=-=-=--=-=-=-==-=-`);
  console.log(scrollRes);
  console.log(`====================================-===-=-=-=--=-=-=-==-=-`);
};

// =-=-=-=-=-=-= ☝ POST Scraping function 👆 =-=-=-=-=-=-=

// ===== Exports =====
const catchAsync = require("../utils/catchAsync.js");
module.exports = {
  targetScraper: catchAsync(targetScraper),
  scrapeMetaDataOfProfile: catchAsync(scrapeMetaDataOfProfile),
};
