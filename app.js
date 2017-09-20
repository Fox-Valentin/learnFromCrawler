// 一 先获取lastid
// 1 接口地址 + 参数
// get参数需要URI编码成十六进制
var http = require('http')
const cheerio = require('cheerio')
const request = require('request')
const fs = require('fs')

const startId = "653093"
const fetchLimit = 10
let fetched = 0
const articleSavePath = './data'
const imgSavePath = './img'


var baseUrl = 'http://www.cnbeta.com'
let getLastId = function(_csrf, op) {
  var apiUrl = baseUrl + '/comment/read'
  return new Promise(function(resolve,reject){
    if(!_csrf || !op){
      return reject(`getLastId() param err: _csrf: ${_csrf}, op: ${op}`)
    } else {
      apiUrl += '?_csrf=' + encodeURIComponent(_csrf) + '&op=' + encodeURIComponent(op)
      http.get(apiUrl,function(res){
        let resChunk = '';
        res.setEncoding('utf8')
        res.on('data',(chunk)=>{
          resChunk+=chunk
        })
        res.on('end',()=>{
          try{
            let json = JSON.parse(resChunk)
            let lastId = json.result.neighbor.next
            resolve(lastId)
          }catch(e){
            reject(e)
          }
        })
      })
    }
  })
}
// 保存内容
// 传入 dom对象 和 news_title
// 检查 目标文件夹是否存在
// 提取文字内容 组装数据
// 存储数据

let saveContent = function($, news_title){
  if(!fs.existsSync(articleSavePath)){
    fs.mkdirSync(articleSavePath)
  }
  $('.article-content p').each(function(index, item) {
    let text = $(this).text().trim()
    if (text) {
      text = '  ' + text + '\n'
    }
    fs.appendFile('./data/' + news_title + '.txt',text,'utf8',function(err){
      if(err){
        throw err
      }
    })
  })
} 

// 保存图片
// 检查保存路径
// 获取标题
// 定义图片文件名
// 获取图片资源地址
// 创建数据流 保存图片

let saveImg = function($,news_title){
  if(!fs.existsSync(imgSavePath)){
    fs.mkdirSync(imgSavePath)
  }
  $('.article-content img').each(function(index, item) {
    let img_title = $(this).parent().next().text().trim().replace(/\//g, '-')
    if(img_title.length > 30){
      img_title = img_title.slice(0,30)
    }
    if(!img_title){
      img_title = 'null'
    }
    console.log(img_title)
    const img_filename = img_title + '.jpg'
    const img_src = $(this).attr('src')
    request(img_src).pipe(fs.createWriteStream(imgSavePath + '/' + news_title + '--------' +img_filename))
  })
}


// 检查抓取次数 超过则推出进程
// 处理301情况
// 对目标地址发送请求 并获取返回的数据
// 从返回的数据中提取 时间和标题
// 从返回的数据中提取下一篇的参数
let fetchPage = function(id, fullpath){
  if(fetched >= fetchLimit){
    fetched = 0;
    console.log(`已经完成 ${fetchLimit}条数据`)
    return process.exit()
  }
  var targetUrl = fullpath || `http://www.cnbeta.com/articles/soft/${id}.htm`
  var client = http.get(targetUrl,function(res){
    if (res.statusCode === 301){
      if (res.headers.location){
        fetchPage(null,res.headers.location)
      } else {
        console.log('fetchPage( relocated. )',targetUrl)
      }
      return client.abort()
    }
    let html = ''
    res.setEncoding('utf-8')
    res.on('data',function(chunk){
      html += chunk
    })
    res.on('end',function(){
      if(html){
        fetched ++
        const $ = cheerio.load(html)
        let time = $('.cnbeta-article .title .meta span:first-child').text().trim()
        let news_title = $('.cnbeta-article .title h1').text().trim().replace(/\//g,'-')
        saveContent($,news_title)
        saveImg($,news_title)
        let _csrf = $('meta[name="csrf-token"]').attr('content')
        let op = '1,'
        let opStr = html.match(/{SID:[^{}]+}/)[0]
        op += opStr.match(/SID:"([^"]+)"/)[1] + ',' + opStr.match(/SN:"([^"]+)"/)[1]
        // console.log(news_title,time)
        getLastId(_csrf,op).then((lastId) => {
          fetchPage(lastId)
        }).catch((error) => {
          console.log(error)
        })
      } else {
        console.log('fetchPage failed.', targetUrl)
      }
    })
  }).on('error',function(err){
    console.log(err)
  })
}
console.log(`即将抓取${fetchLimit}条数据`)
fetchPage(startId)