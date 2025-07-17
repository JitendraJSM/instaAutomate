const db = require("./db.js");
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

const testFunction = async function (url) {
  await this.page.navigateTo(url);
  console.log(`ok`);

  // Extract post metadata from meta tags
  // NOTE: this function Works in page context
  const extractPostMetadata = async () => {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const metaContent = descriptionMeta
      ? descriptionMeta.getAttribute("content")
      : "";

    // Parse metadata using regex
    const likesMatch = metaContent.match(/(\d+(?:,\d+)*) likes/);
    const commentsMatch = metaContent.match(/(\d+(?:,\d+)*) comments/);
    const usernameMatch = metaContent.match(/- ([\w._]+) on/);
    const dateMatch = metaContent.match(/on ([\w\s,]+)/);

    return {
      likesCount: likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) : 0,
      commentsCount: commentsMatch
        ? parseInt(commentsMatch[1].replace(/,/g, ""))
        : 0,
      username: usernameMatch ? usernameMatch[1] : "",
      postDate: dateMatch ? dateMatch[1] : "",
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

  //  clickLoadMoreCommentsBTN function clicks and checks if the button is clicked or not
  //  if the button is clicked then it returns true
  //  if the button is not clicked then it returns false
  const clickLoadMoreCommentsBTN = async function () {
    let isMoreCommentsLoaded = false;
    let returnFlag; // possible values "load BTN not exists"
    // Get initial state of container
    const getContainerState = () => {
      const container = document.querySelector("._a9z6._a9z9._a9za");
      if (!container) return null;

      return {
        childCount: container.children.length,
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
    };

    // Function to scroll down in comments container
    // NOTE: this function Works in page context
    const scrollDownInCommentsDataBox = () => {
      const container = document.querySelector("._a9z6._a9z9._a9za");
      if (container) {
        container.scrollTop = container.scrollHeight;
        return true;
      }
      return false;
    };

    // Check LoadMoreCommentsBTN is available or not if exists then it returns true
    const checkIsBTNExists = async function () {
      const btn = document.querySelector(
        'svg[aria-label="Load more comments"]'
      );
      return btn !== null;
    };

    const checkIsMoreCommentsLoaded = async function (beforeState) {
      // Wait a moment for content to load
      await this.utils.randomDelay(1, 2); // Adjust delay as needed
      // await this.page.waitForNetworkIdle();

      // Get state after clicking
      const afterState = await this.page.evaluate(getContainerState);
      if (!afterState) {
        console.log(
          `Comments Container (ie. "._a9z6._a9z9._a9za") not found after clicking`
        );
        return false;
      }

      // Compare states to determine if click was successful
      const isSuccess =
        afterState.childCount > beforeState.childCount ||
        afterState.scrollHeight > beforeState.scrollHeight;

      console.log(`Button click ${isSuccess ? "successful" : "failed"}:`);
      console.log(
        `- Before: ${beforeState.childCount} children, height: ${beforeState.scrollHeight}`
      );
      console.log(
        `- After: ${afterState.childCount} children, height: ${afterState.scrollHeight}`
      );

      return isSuccess;
    };

    // Get state before clicking
    const beforeState = await this.page.evaluate(getContainerState);
    if (!beforeState) {
      console.log(
        `Comments Container (ie. "._a9z6._a9z9._a9za") not found before clicking`
      );
      return false;
    }
    // Try scrolling down first
    // const scrolled = scrollDownInCommentsDataBox(); // Will not works as scrollDownInCommentsDataBox function Works in page context
    await this.page.evaluate(scrollDownInCommentsDataBox);

    isMoreCommentsLoaded = await checkIsMoreCommentsLoaded.call(
      this,
      beforeState
    );
    if (isMoreCommentsLoaded) return isMoreCommentsLoaded;

    const isBTNExists = await this.page.evaluate(checkIsBTNExists);
    if (!isBTNExists) return isBTNExists;

    // Click the button
    await this.page.clickNotClickable('svg[aria-label="Load more comments"]');

    isMoreCommentsLoaded = await checkIsMoreCommentsLoaded.call(
      this,
      beforeState
    );
    return isMoreCommentsLoaded;
  };

  // Function to extract comments from DOM
  // NOTE: this function Works in page context
  const extractComments = () => {
    const commentElements = document.querySelectorAll("._a9zj._a9zl");
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
    // const mediaId = getMediaId();   // NOTE: this function Works in page context
    const mediaId = await this.page.evaluate(getMediaId);

    // Initialize comments collection with deduplication
    const uniqueComments = new Map();
    let previousCommentsCount = 0;
    let loadAttempts = 0;
    const MAX_LOAD_ATTEMPTS = 20; // Prevent infinite loops

    // First extraction of available comments
    // let currentComments = extractComments(); // Will not works as extractComments function Works in page context
    let currentComments = await this.page.evaluate(extractComments);

    currentComments.forEach((comment) => {
      uniqueComments.set(comment.username + "|" + comment.text, comment);
    });

    // Continue loading comments until we have all or reach max attempts
    while (
      uniqueComments.size < metadata.commentsCount &&
      loadAttempts < MAX_LOAD_ATTEMPTS
    ) {
      previousCommentsCount = uniqueComments.size;

      // If scrolling didn't work or we're at the bottom, try clicking "Load more"

      const clicked = await clickLoadMoreCommentsBTN.call(this);
      if (clicked) loadAttempts = 0;
      else {
        loadAttempts++;
        console.log(
          `Load more button clicked Try number: ${loadAttempts} times.`
        );
        console.log(`Skipping the remaining loop.`);
        continue;
      }

      // Extract newly loaded comments
      // currentComments = extractComments();  // Will not works as extractComments function Works in page context
      currentComments = await this.page.evaluate(extractComments);
      currentComments.forEach((comment) => {
        uniqueComments.set(comment.username + "|" + comment.text, comment);
      });
      if (uniqueComments.size === metadata.commentsCount) {
        console.log(
          `Breaking the loop as total comments scraped is equal to total comments in the post.(ie uniqueComments.size: ${uniqueComments.size} and metadata.commentsCoun: ${metadata.commentsCoun})`
        );
        break;
      }
    }

    // Prepare final result
    return {
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
