'use strict';
const Twit = require('twit');
const cron = require('cron').CronJob;

const twitter = new Twit({
  consumer_key: process.env.TWITTER_API_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_API_CONSUMER_SECRET,
  access_token: process.env.TWITTER_API_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_API_ACCESS_TOKEN_SECRET
});

let checkedTweets = [];

function getHomeTimeLine() {
  twitter.get('statuses/home_timeline', {}, function(error, tweets, response) {
    if (error) console.log(error);
    // 初回起動時は取得するだけで終了
    if (checkedTweets.length === 0) {
      tweets.forEach(function(homeTimeLineTweet, key) {
        checkedTweets.push(homeTimeLineTweet); // 配列に追加
      });

      return;
    }

    const newTweets = [];
    tweets.forEach(function(homeTimeLineTweet, key) {
      if (isCheckedTweet(homeTimeLineTweet) === false && isStream(homeTimeLineTweet) === false) {
        responseHomeTimeLine(homeTimeLineTweet);
        newTweets.push(homeTimeLineTweet); // 新しいツイートを追加
      }
    });
        
    // 調査済みリストに追加と、千個を超えていたら削除
    checkedTweets = newTweets.concat(checkedTweets); // 配列の連結
    if (checkedTweets.length > 1000) checkedTweets.length = 1000; // 古い要素を消して要素数を1000個にする。
  });
}

function isCheckedTweet(homeTimeLineTweet) {
  // ボット自身のツイートは無視する。
  if (homeTimeLineTweet.user.screen_name === 'Su') {
    return true;
  }

  for (let checkedTweet of checkedTweets) {
    // 同内容を連続投稿をするアカウントがあるため、一度でも返信した内容は返信しない仕様にしています。
    if (checkedTweet.id_str === homeTimeLineTweet.id_str || checkedTweet.text === homeTimeLineTweet.text) {
      return true;
    }
  }

  return false;
}

function isStream(homeTimeLineTweet) {
  //@Su_bot_by7を含むかどうか
  const str = `${homeTimeLineTweet.text}`;
  const judge = /\@Su_bot_by7/.test(str);
  return judge;
}

const responses = ['面白い！', 'すごい！', 'なるほど！'];

function responseHomeTimeLine(homeTimeLineTweet) {
  const tweetMessage = '@' + homeTimeLineTweet.user.screen_name + '「' + homeTimeLineTweet.text + '」 ' + responses[Math.floor(Math.random() * responses.length)];
  twitter.post('statuses/update', {
    status: tweetMessage,
    in_reply_to_status_id: homeTimeLineTweet.id_str
  }).then((tweet) => {
    console.log(tweet);
  }).catch((error) => {
    throw error;
  });
}

const cronJob = new cron({
  cronTime: '00 0-59/3 * * * *', // ３分ごとに実行
  start: true, // newした後即時実行するかどうか
  onTick: function() {
    getHomeTimeLine();
  }
});
getHomeTimeLine();

const stream = twitter.stream('statuses/filter', { track: '@Su_bot_by7' });
stream.on('tweet', function(tweet) {
  console.log(tweet.text);
    
  const tweetMessage = '@' + tweet.user.screen_name + ' 呼んだ？?　(*´ω｀*)';
  twitter.post('statuses/update', {
    status: tweetMessage,
    in_reply_to_status_id: tweet.id_str
  })
  .then((tweet) => {
    console.log(tweet);
  })
  .catch((error) => {
    throw error;
  });
});

stream.on('error', function(error) {
  throw error;
});