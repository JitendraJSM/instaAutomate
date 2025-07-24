# Development Until now -

1. New profile add
   - When ever a new profile added all other profile's get a due Task to follow that new profile
   - And that new profile get due tasks to follow all other agents profiles and scrapers profiles.
2. Follow by Script
   - When ever a follow dueTask is done it will get's removed from profilesData.json from that profile and also from it's own Data file.
   - And pushed to it's own Data file's automatedFollowed array[] as {"userName": "manisha.sen.25","date": "2025-06-15T13:41:57.957Z"}
3. Profile Scraping
   - Scrapes all metaData of profile (by instaScraper.js).
   - Download all media of posts like video or images or all images of carousal post.
4. Media Editing
   - All videos and images can be edited by videoEditor and imageEditor.

# Research / Analaysis

- To scrape all posts and their meta data user (done by automation) must scroll through whole reels / posts page and intercept
  All requests to "https://www.instagram.com/graphql/query" which have
  headers= { ...otherHeaders, "x-fb-friendly-name": "PolarisProfilePostsQuery", ...otherHeaders }
  Or
  headers= { ...otherHeaders, "x-fb-friendly-name": "PolarisProfilePostsTabContentQuery_connection", ...otherHeaders }
- What to Scrape is `res.JSON().data.xdt_api__v1__feed__user_timeline_graphql_connection.edges` is Actually an array of 12 object in which each object contains 2 properties 1. node (i.e. postMetaData) & 2. cursor (i.e. Emply property)
- Reel's URL is : `https://www.instagram.com/${userNameOfAccountOwner}/reel/${node.code}`
- HD Video URL is : `node.video_versions[0].url` or `node.video_versions[1].url` or `node.video_versions[2].url` Each of these 3 must have width=720 && height=1280, Then "\u0026" must be replaced by "&" in the url, (TODO: Also you must check which one of these 3 is highest in Quality, Done all posts generally have same quality or the first one have highest quality.)
- To confirm Check `node.user.username` or `node.owner.username`
- TODO: Check other these given below meta data for other posts
  `node.title`
  `node.comment_count`
  `node.like_count`
  `node.view_count`
  `node.media_type`
  `node.clips_metadata`
  `node.comments`

- Different types or url of Insta
  https://www.instagram.com/p/DLKZmEATRYH/
  https://www.instagram.com/reel/DLKZmEATRYH/

# To Develop

1. Profile Scraper Done
2. Posts liker, commenters, comments and other meta-data Scraper to target. Done
3. Restricter module / function / script.
4. Controller module / function / script.

# Controller

Controller decides which task should be assigned to which agent or scraper and when that task should be done.

# Posts Scraper Done

- From posts page $('meta[name="description"]') content will have all meta data of post number of likes, comments, date of post and the description of post, as given below
<meta name="description" content="19 likes, 0 comments - javascript_tips on April 25, 2018: &quot;Hey fellows!
Just a simple tips today: short-circuits conditionals.

#javascript #js #ecmascript #ecmascript6 #es6 #tips #tricks #daily #programming&quot;. ">

- The link of image if it is image is $(".\_aagv img").src

#### Date 22/07/2025

Now approximatly everything can be done by automation the code is developed, now it's time to decide what flow is best.
Most things that can be done by automation are as below:-

- follow any account by username
- like any post by url or by username
- scrape the whole profile with followers, followings and all post's media with their number of likes and comments.
- scrape all comments of any post by postURL.
- scrape at max 100 likers of a post by postURL.
- edit reel and edit image to try not to get copyright issue.

# Requirements from automation -

## Controller -

## Agents -

- Upload posts with a consistency.
- follow Target Accounts to get engagement.
- like Target Accounts posts to get engagement.
- comment on Target Accounts posts to get engagement.
- DM Target Accounts to get engagement.
- insta app on time must be at least 1 hr everyday.
- NOTE: after doing any of above action data must be updated.

## Scrapers -

- Scrape posts, profiles, metaData, likers, commenters, comments ,....etc.
- NOTE: after doing any of above action data must be updated.

# Flow -
