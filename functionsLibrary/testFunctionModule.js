const db = require("./db.js");
const path = require("path");
const fs = require("fs-extra");

// const testFunction = async function () {
//   console.log(`testFunction started.`);
//   // Posts Scraping from response
//   const extractPostsFromResponse = async function (responseJSON) {
//     // Scrape the post nodes & pushes then to this.state.targetToScrape.latestScrapedMetaData.posts
//     responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.forEach((postNode) => {
//       if (this.state.targetToScrape.latestScrapedMetaData.posts.some((post) => post.code === postNode.node.code)) return;
//       try {
//         const node = {
//           code: postNode.node.code,
//           pk: postNode.node.pk,
//           caption: postNode.node.caption,
//           caption: postNode.node.taken_at, // this is date and time of post upload/1000
//           userName: postNode.node.owner.username,
//           coauthor_producers: postNode.node.coauthor_producers,
//           title: postNode.node.title,
//           comment_count: postNode.node.comment_count,
//           like_count: postNode.node.like_count,
//           product_type: postNode.node.product_type,
//           media_type: postNode.node.media_type,
//           clips_metadata: postNode.node.clips_metadata,
//           comments: postNode.node.comments,
//           location: postNode.node?.location,
//         };
//         if (postNode.node.product_type === "clips") node.video_versions = postNode.node.video_versions[0].url;
//         else if (postNode.node.product_type === "feed") {
//           node.image_versions2 = postNode.node.image_versions2.candidates[0].url;
//           node.accessibility_caption = postNode.node.accessibility_caption;
//         } else if (postNode.node.product_type === "carousel_container") {
//           node.carousel_media_count = postNode.node.carousel_media_count;
//           node.carousel_media = [];
//           node.carousel_media_count = postNode.node.carousel_media.forEach((obj, i) => node.carousel_media.push({ url: obj.image_versions2.candidates[0].url, imgIndex: i }));
//         }
//         this.state.targetToScrape.latestScrapedMetaData.posts.push(node);
//       } catch (error) {
//         console.log(error);

//         console.log(`Cannot extract data from postNade: ${postNode}`);
//         console.log(`-=-=-=-=-=-=-=-`);
//         console.log(postNode.node.code);
//         console.log(`-=-=-=-=-=-=-=-`);
//       }
//     });

//     // Sort posts by taken_at date in descending order
//     this.state.targetToScrape.latestScrapedMetaData.posts.sort((a, b) => b.taken_at - a.taken_at);

//     // responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info.has_next_page decides to scroll for more posts (true) or all posts are scraped (false).

//     if ("has_next_page" in responseJSON.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.page_info) {
//       if (responseJSON.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info.has_next_page) return "scroll";
//       else return "stop Scrolling";
//     } else {
//       console.log(`Please check in debugger mode that why has_next_page does not exists.`);
//       await this.utils.askUser("Press Enter to Continue...");
//     }
//   };

//   // Filter function - process requests
//   const commentsScrapingFilterFn = async (request, response) => {
//     {
//       if (request.url() === "https://www.instagram.com/graphql/query") {
//         const headers = request.headers()["x-root-field-name"];
//         console.log("Request Headers:", headers);
//         return true;
//       }
//     }
//   };

//   // Handler function - successful requests
//   const commentsScrapingHandlerFn = async (request, response) => {
//     if (request.headers()["x-root-field-name"] === "xdt_api__v1__media__media_id__comments__connection") {
//       const resJSON = await response.json();

//       console.log(`==============================================`); // for testing purpose only
//       await fs.appendFile("./scraperTesting/responseAsItIs.json", JSON.stringify(resJSON, null, 2) + ",\n"); // for testing purpose only
//       // console.log(`Currently length of scrapedMetaDataOfPosts is : ${this.state.targetToScrape.latestScrapedMetaData.posts.length}`); // for testing purpose only
//       console.log(`==============================================`); // for testing purpose only

//       // this.state.targetToScrape.scrapingVariables.has_next_page = await extractPostsFromResponse.call(this, resJSON);

//       // this.state.targetToScrape.scrapingVariables.pagesScraped++;
//       // await fs.writeFile("./scraperTesting/extractedPosts.json", JSON.stringify(this.state.currentResourceData.posts, null, 2));
//     }
//   };
//   //
//   console.log(`Starting to response Listener for posts scraping ....`);

//   // this.state.targetToScrape.scrapingVariables = { pagesScraped: 0, has_next_page: true };
//   // this.state.targetToScrape.removeResponseListener = await this.page.addResponseListener.call(this, commentsScrapingFilterFn.bind(this), commentsScrapingHandlerFn.bind(this));
//   this.state.removeResponseListener = await this.page.addResponseListener.call(this, commentsScrapingFilterFn.bind(this), commentsScrapingHandlerFn.bind(this));

//   await this.page.navigateTo(`https://www.instagram.com/chandani144__/reel/DMCDU3CBqIc/`); // Navigate to a new tab to reset the page state
//   // await this.page.navigateTo(`https://www.instagram.com/${this.state.targetToScrape?.targetString}/`);
//   console.log(`response listener added.`);
// };

// Different Type of reels posts pages are as below:
// 1. No Description, with View Hidden Comments Btn
//      - URL :  https://www.instagram.com/chandani144__/reel/DMA1p8ahX33/
//      - total 96 comments acc. to metadata, 88 scraped and 1 hidden
// 2. With Description but without View Hidden Comments BTN but still some comments are hidden
//      - URL :  https://www.instagram.com/prity__mehra___/reel/DC9KJd4SfBM/
//      - total 21 comments acc. to metadata, 9 scraped

const testFunction = async function () {
  const listOfPostsURLs = [
    "https://www.instagram.com/p/DKZ10yvzEqS/",
    "https://www.instagram.com/p/DGvPYbATx20/",
    "https://www.instagram.com/p/DE6pjjNTzEr/",
    "https://www.instagram.com/p/DEpSiNHTzgy/",
  ];
  const resultsOfScraping = [];
  for (const url of listOfPostsURLs) {
    console.log(`Scraping post and comments from URL: ${url}`);
    const result = await commentsScraper.call(this, url);
    resultsOfScraping.push(result);
    console.log(`------ Scraping comments of URL: ${url} is complete. ------`);
    await this.utils.randomDelay(1, 2);
  }

  // ---- 👇 temp for checking 👇 ----

  const parentFolderPath1 = path.join(__dirname, `../data/instaScrapedData/postsData/`);
  // Ensure logs directory exists
  await fs.ensureDir(parentFolderPath1);
  const fileName1 = `completedData.json`;
  const filePath1 = path.join(parentFolderPath1, fileName1);
  await fs.writeFile(filePath1, JSON.stringify(resultsOfScraping, null, 2));
  // ---- 👆 temp for checking 👆 ----
  console.log(`Scraping ENDED.`);
};

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

  // Extract post metadata from meta tags
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

  // Extract media ID for potential video content
  // NOTE: this function Works in page context
  const getMediaId = () => {
    const mediaMetaTag = document.querySelector('meta[property="al:ios:url"]');
    if (!mediaMetaTag) return null;

    const mediaContent = mediaMetaTag.getAttribute("content");
    const mediaIdMatch = mediaContent.match(/id=(\d+)/);
    return mediaIdMatch ? mediaIdMatch[1] : null;
  };

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
    const metadata = await await this.page.evaluate(extractPostMetadata);
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

module.exports = {
  testFunction,
};
