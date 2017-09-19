const http = require('http');
const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');

const startId = "620719";
const articalSavePath = "./data";
const imgSavePath = "./img";
const fetchLimit = process.argv[2] || 50;

//获取下一篇文章id
let fetched = 0;
// 开始说明思路
// 1 进入新闻 详情页 寻找 详情页之间跳转的动态参数
// 2 在具体触发跳转的地方 寻找 下一条的 动态参数 lastid
// 3 寻找lastid的来源
// 4 在来源处 寻找获取lastid的方法 可能是后端一次性渲染 也有可能是ajax动态渲染
// 5 如果是后端渲染 用cheerio去截取 如果是ajax就模仿请求去拿到

// 获取下一篇文章的id 在页面上的下一页来寻找
// 页面上的下一页按钮是 js  动态渲染的链接 可以在js文件中找到
// 发现是一个 ajax请求 请求地址就是 /comment/read
// 方法中已经 标识获取的键 res.neighbor.last 就是在结果解析里面获取lastid
let syncLast = function(_csrf, op) {
  // 这里模仿请求头 但是目前没用上
  let syncLastApi = {
    host: 'www.cnbeta.com',
    path: '/comment/read',
    header: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.6,en;q=0.4",
      "Cache-Control": "no-cache",
      "DNT": 1,
      "Host": "www.cnbeta.com",
      "Pragma": "no-cache",
      //"Referer":http://www.cnbeta.com/articles/tech/620719.htm,
      //"Cookie":_csrf=543c10a85adaf371248716b0985d4f7a29e570c032c4c10b2c9b8cfeaaf442d1a%3A2%3A%7Bi%3A0%3Bs%3A5%3A%22_csrf%22%3Bi%3A1%3Bs%3A32%3A%22Ojjc9pBn37ASZkfvxBVvAagrprsA3AJw%22%3B%7D; PHPSESSID=lcdf05d43gqo6shsuh70ov50bl,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3080.5 Safari/537.36"
    }
  };
  // syncUrl + _csrf + op 是一个xhr请求 开头说了 这里获取下一个新闻的id 难道下一个新闻的id 不是连续的？
  let syncUrl = 'http://www.cnbeta.com/comment/read';
  return new Promise(function(resolve, reject) {
    // 没有这两个关键参数 拒绝
    // 虽然 这两个参数都在doc找的到
    if (!_csrf || !op) {
      return reject(`syncLast() param error: _csrf: ${_csrf}, op: ${op}`);
    } else {
      //syncLastApi.path = syncLastApi.path + '?_csrf=' + encodeURIComponent(_csrf) + '&op=' + encodeURIComponent(op);
      syncUrl += '?_csrf=' + encodeURIComponent(_csrf) + '&op=' + encodeURIComponent(op);
      http.get(syncUrl, function(res) {
        // 存储请求到的数据
        let resChunk = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          resChunk += chunk;
        });
        res.on('end', () => {
          // 解析结果 获取lastid 并返回
          try {
            let json = JSON.parse(resChunk);
            let lastId = json.result.neighbor.last;
            resolve(lastId);
          } catch (e) {
            reject(e);
          }
        });

      });
    }

  });
};
//保存内容
let savedContent = function($, news_title) {
  if (!fs.existsSync(articalSavePath)) {
    fs.mkdirSync(articalSavePath);
  }
  $('.article-content p').each(function(index, item) {
    let x = $(this).text().trim();
    if (x) {
      x = '  ' + x + '\n';
    }
    fs.appendFile('./data/' + news_title + '.txt', x, 'utf-8', function(err) {
      if (err) {
        console.log(err);
      }
    });
  });
};
//保存图片
let savedImg = function($, news_title) {
  if (!fs.existsSync(imgSavePath)) {
    fs.mkdirSync(imgSavePath);
  }
  $('.article-content img').each(function(index, item) {
    let img_title = $(this).parent().next().text().trim().replace(/\//g, '-');
    if (img_title.length > 30) {
      img_title = img_title.slice(0, 30);
    }
    if (!img_title) {
      img_title = "Null";
    }
    const img_filename = img_title + '.jpg';
    const img_src = $(this).attr('src'); //获取图片的url

    request(img_src).pipe(fs.createWriteStream(imgSavePath + '/' + news_title + '---' + img_filename));
  });
};
// 抓取某一页的新闻
//抓取新闻
// params startId fullpath
let fetchPage = function(x, fullpath) {
  // 在此处计数 跳出进程
  if (fetched > fetchLimit) {
    fetched = 0;
    console.log(`已完成抓取 ${fetchLimit} 条数据`);
    return process.exit();
  }
  // 拼接完整的地址
  let articalUrl = fullpath || `http://www.cnbeta.com/articles/${x}.htm`;
  // 定义一个服务
  let client = http.get(articalUrl, function(res) {
    // 遇见 301 则重新开始抓取
    if (res.statusCode === 301) {
      if (res.headers.location) {
        fetchPage(null, res.headers.location);
      } else {
        console.log('fetchPage() reLocated. ', articalUrl);
      }
      return client.abort();
    }
    // 正式抓取
    let html = '';
    res.setEncoding('utf-8');

    res.on('data', function(chunk) {
      html += chunk;
    });
    res.on('end', function() {
      if (html) {
        // 抓取完毕 累计次数
        fetched++;
        // cheerio 相当于服务端的jq
        const $ = cheerio.load(html);
        // 提取时间
        const time = $('.cnbeta-article .title .meta span:first-child').text().trim();
        // 提取新闻标题
        let news_title = $('.cnbeta-article .title h1').text().trim().replace(/\//g, '-');
        // 存储内容和图片
        savedContent($, news_title);
        savedImg($, news_title);
        console.log(`got: ${news_title} url: ${articalUrl}`);
        //抓取下一篇
        // 提取两个参数 用于寻找lastid
        let _csrf = $('meta[name="csrf-token"]').attr('content');
        let opStr = html.match(/{SID:[^{}]+}/)[0];
        let op = '1,';
        op += opStr.match(/SID:"([^"]+)"/)[1] + ',' + opStr.match(/SN:"([^"]+)"/)[1];
        syncLast(_csrf, op).then(function(lastId) {
          // 回调 继续抓取
          fetchPage(lastId);
        }).catch(function(error) {
          console.log(error);
        });
      } else {
        console.log('fetchPage() failed. ', articalUrl);
      }
    });

  }).on('error', function(err) {
    console.log(err);
  });
};

console.log(`即将抓取 ${fetchLimit} 条数据`);
fetchPage(startId);