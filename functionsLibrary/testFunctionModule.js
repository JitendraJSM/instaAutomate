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
  const extractPostMetadata = async () => {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const metaContent = descriptionMeta ? descriptionMeta.getAttribute("content") : "";

    // Parse metadata using regex
    const likesMatch = metaContent.match(/(\d+(?:,\d+)*) likes/);
    const commentsMatch = metaContent.match(/(\d+(?:,\d+)*) comments/);
    const usernameMatch = metaContent.match(/- ([\w._]+) on/);
    const dateMatch = metaContent.match(/on ([\w\s,]+)/);

    return {
      likesCount: likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) : 0,
      commentsCount: commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, "")) : 0,
      username: usernameMatch ? usernameMatch[1] : "",
      postDate: dateMatch ? dateMatch[1] : "",
    };
  };
  const postMetadata = await this.page.evaluate(extractPostMetadata);
  // Extract media ID for potential video content
  const getMediaId = () => {
    const mediaMetaTag = document.querySelector('meta[property="al:ios:url"]');
    if (!mediaMetaTag) return null;

    const mediaContent = mediaMetaTag.getAttribute("content");
    const mediaIdMatch = mediaContent.match(/id=(\d+)/);
    return mediaIdMatch ? mediaIdMatch[1] : null;
  };

  postMetadata.postMediaId = await this.page.evaluate(getMediaId);
  console.log(postMetadata);
  // Function to scroll down in comments container
  const scrollDownInCommentsDataBox = () => {
    const container = document.querySelector("._a9z6._a9z9._a9za");
    if (container) {
      container.scrollTop = container.scrollHeight;
      return true;
    }
    return false;
  };
  const scrollRes = await this.page.evaluate(scrollDownInCommentsDataBox);
  console.log(`====================================-===-=-=-=--=-=-=-==-=-`);
  console.log(scrollRes);
  console.log(`====================================-===-=-=-=--=-=-=-==-=-`);
};

module.exports = {
  testFunction,
};
