// on url "https://www.instagram.com/reel/DMC605nt0OU/"
const commentContainer = $(
  ".html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xyri2b.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.xsag5q8.xz9dl7a.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1"
);

// ========================
const comments = [];
const completeCommentElementsArray = $$(
  ".html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xyri2b.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.xsag5q8.xz9dl7a.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1"
).map((el) => el.innerText);
for (const comment of completeCommentElementsArray) {
  const commentArray = comment.split("\n");
  const username = commentArray[0];
  const commentText = commentArray[1];
  comments.push({ username, commentText });
}
comments;
